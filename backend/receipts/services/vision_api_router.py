"""
High-Performance Vision API Router with intelligent fallback and circuit breaker pattern.
"""
import os
import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
import threading

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.db import transaction
from asgiref.sync import sync_to_async

from .openai_service import OpenAIVisionService
from .xai_service import XAIGrokService
from .performance_optimizer import ImageCache, ImageOptimizer, RateLimiter, PerformanceMonitor
from ..models import APIUsageStats

logger = logging.getLogger(__name__)

# Thread pool for async operations - Enhanced for Heroku
executor = ThreadPoolExecutor(max_workers=min(16, (os.cpu_count() or 1) * 2))

# Concurrent processing semaphore to prevent resource exhaustion
MAX_CONCURRENT_REQUESTS = 8
processing_semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)


class APICircuitBreaker:
    """Circuit breaker for API failure management."""
    
    def __init__(self, failure_threshold: int = 5, recovery_time: int = 300):
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time  # seconds
        
    def is_api_available(self, api_name: str) -> bool:
        """Check if API is available based on circuit breaker state."""
        cache_key = f"circuit_breaker_{api_name}"
        breaker_data = cache.get(cache_key, {"failures": 0, "last_failure": None})
        
        if breaker_data["failures"] < self.failure_threshold:
            return True
            
        # Check if recovery time has passed
        if breaker_data["last_failure"]:
            last_failure = datetime.fromisoformat(breaker_data["last_failure"])
            if datetime.now() - last_failure > timedelta(seconds=self.recovery_time):
                # Reset circuit breaker
                cache.delete(cache_key)
                return True
                
        return False
    
    def record_failure(self, api_name: str):
        """Record API failure."""
        cache_key = f"circuit_breaker_{api_name}"
        breaker_data = cache.get(cache_key, {"failures": 0, "last_failure": None})
        
        breaker_data["failures"] += 1
        breaker_data["last_failure"] = datetime.now().isoformat()
        
        cache.set(cache_key, breaker_data, timeout=self.recovery_time * 2)
        logger.warning(f"API {api_name} failure recorded. Total failures: {breaker_data['failures']}")
    
    def record_success(self, api_name: str):
        """Record API success - reset circuit breaker."""
        cache_key = f"circuit_breaker_{api_name}"
        cache.delete(cache_key)


class VisionAPIRouter:
    """
    High-performance intelligent router for vision APIs with fallback and load balancing.
    """
    
    def __init__(self):
        self.openai_service = OpenAIVisionService()
        self.xai_service = XAIGrokService()
        self.circuit_breaker = APICircuitBreaker()
        
        # Performance optimizations
        self.image_cache = ImageCache()
        self.image_optimizer = ImageOptimizer()
        self.rate_limiter = RateLimiter()
        self.performance_monitor = PerformanceMonitor()
        
        self.primary_api = settings.VISION_API_PRIMARY
        self.fallback_api = settings.VISION_API_FALLBACK
        self.max_retries = getattr(settings, 'VISION_API_MAX_RETRIES', 3)
        
        # Connection pooling and performance settings
        self.enable_caching = getattr(settings, 'VISION_API_ENABLE_CACHING', True)
        self.enable_image_optimization = getattr(settings, 'VISION_API_ENABLE_OPTIMIZATION', True)
        self.enable_rate_limiting = getattr(settings, 'VISION_API_ENABLE_RATE_LIMITING', True)
        
    def _get_service(self, api_name: str):
        """Get service instance by API name."""
        services = {
            'openai': self.openai_service,
            'xai': self.xai_service,
            'xai_grok': self.xai_service,  # Alternative name
        }
        return services.get(api_name.lower())
    
    def _get_optimized_api_order(self, preferred_api: Optional[str] = None) -> List[str]:
        """Get optimized API order based on performance and availability."""
        # Start with configured preferences
        if preferred_api:
            api_order = [preferred_api, self.primary_api, self.fallback_api]
        else:
            api_order = [self.primary_api, self.fallback_api]
        
        # Remove duplicates and None values
        api_order = [api for api in list(dict.fromkeys(api_order)) if api]
        
        # Filter out circuit-broken APIs
        available_apis = []
        for api_name in api_order:
            if self.circuit_breaker.is_api_available(api_name):
                available_apis.append(api_name)
        
        # Sort by recent performance (fastest first)
        try:
            performance_data = self.performance_monitor.get_recent_performance()
            available_apis.sort(key=lambda x: performance_data.get(x, {}).get('avg_response_time', 999))
        except Exception as e:
            logger.warning(f"Could not sort APIs by performance: {e}")
        
        return available_apis
    
    async def _process_with_single_api(self, api_name: str, image_file, filename: str) -> Optional[Dict[str, Any]]:
        """Process with a single API using optimized timeout and error handling."""
        service = self._get_service(api_name)
        if not service:
            raise ValueError(f"Unknown API service: {api_name}")
        
        # Check rate limiting
        if self.enable_rate_limiting and not self.rate_limiter.can_make_request(api_name):
            wait_time = self.rate_limiter.get_wait_time(api_name)
            if wait_time > 5:  # Don't wait more than 5 seconds
                raise Exception(f"Rate limit exceeded, wait time too long: {wait_time:.1f}s")
            await asyncio.sleep(wait_time)
        
        # Check cache first
        if self.enable_caching:
            cached_result = self.image_cache.get_cached_result(image_file, api_name)
            if cached_result:
                cached_result['router_metadata']['cache_hit'] = True
                return cached_result

        start_time = time.time()
        
        try:
            # Optimize image if enabled
            if self.enable_image_optimization:
                optimized_image = self.image_optimizer.optimize_for_vision(image_file)
                processing_image = optimized_image
                cache_image = image_file  # Use original for caching
            else:
                image_file.seek(0)
                processing_image = image_file
                cache_image = image_file
            
            # Determine timeout based on receipt complexity
            is_complex_receipt = (
                'grocery' in filename.lower() or 
                'costco' in filename.lower() or
                'warehouse' in filename.lower() or
                'asda' in filename.lower() or
                'tesco' in filename.lower() or
                'sainsbury' in filename.lower() or
                'cpg' in filename.lower()
            )
            
            api_timeout = 120.0 if is_complex_receipt else 45.0  # Longer for complex receipts
            
            # Process with enhanced v0.6 method for OpenAI
            if api_name == 'openai' and hasattr(service, 'process_receipt_v6'):
                result = await asyncio.wait_for(
                    service.process_receipt_v6(processing_image, filename, high_res=False),
                    timeout=api_timeout
                )
            else:
                # Fallback to standard method for other APIs
                result = await asyncio.wait_for(
                    service.process_receipt(processing_image, filename),
                    timeout=api_timeout
                )
            
            processing_time = time.time() - start_time
            
            # Check for errors
            if 'error' in result:
                self.circuit_breaker.record_failure(api_name)
                cost = Decimal(str(result.get('processing_metadata', {}).get('cost_usd', 0)))
                await self._update_usage_stats(api_name, False, processing_time, cost)
                raise Exception(result['error'])
            
            # Success
            self.circuit_breaker.record_success(api_name)
            cost = Decimal(str(result.get('processing_metadata', {}).get('cost_usd', 0)))
            await self._update_usage_stats(api_name, True, processing_time, cost)
            
            # Cache successful result
            if self.enable_caching:
                self.image_cache.cache_result(cache_image, api_name, result)
            
            # Log performance metrics
            try:
                from PIL import Image
                img_temp = Image.open(image_file)
                image_size = img_temp.size
                img_temp.close()
            except:
                image_size = (0, 0)
            
            self.performance_monitor.log_processing_metrics(
                api_name, processing_time, image_size, cost
            )
            
            return result
            
        except asyncio.TimeoutError:
            processing_time = time.time() - start_time
            self.circuit_breaker.record_failure(api_name)
            await self._update_usage_stats(api_name, False, processing_time, Decimal('0'))
            raise Exception(f"API timeout after {processing_time:.1f}s")
            
        except Exception as e:
            processing_time = time.time() - start_time
            self.circuit_breaker.record_failure(api_name)
            await self._update_usage_stats(api_name, False, processing_time, Decimal('0'))
            raise
    
    @sync_to_async
    def _update_usage_stats_sync(self, api_name: str, success: bool, response_time: float, cost: Decimal):
        """Update API usage statistics synchronously."""
        try:
            with transaction.atomic():
                today = timezone.now().date()
                stats, created = APIUsageStats.objects.get_or_create(
                    date=today,
                    api_name=api_name,
                    defaults={
                        'requests_count': 0,
                        'successful_requests': 0,
                        'failed_requests': 0,
                        'total_cost_usd': Decimal('0'),
                        'average_response_time': 0
                    }
                )
                
                # Update counters
                stats.requests_count += 1
                if success:
                    stats.successful_requests += 1
                else:
                    stats.failed_requests += 1
                
                # Update cost
                stats.total_cost_usd += cost
                
                # Update average response time
                total_requests = stats.requests_count
                current_avg = stats.average_response_time
                stats.average_response_time = ((current_avg * (total_requests - 1)) + response_time) / total_requests
                
                stats.save()
                
        except Exception as e:
            logger.error(f"Failed to update usage stats: {str(e)}")
    
    async def _update_usage_stats(self, api_name: str, success: bool, response_time: float, cost: Decimal):
        """Update API usage statistics asynchronously."""
        await self._update_usage_stats_sync(api_name, success, response_time, cost)
    
    async def process_receipt(self, image_file, filename: str = "", preferred_api: Optional[str] = None) -> Dict[str, Any]:
        """
        Process receipt with optimized performance and fast failover.
        
        Args:
            image_file: File object containing the receipt image
            filename: Original filename for context
            preferred_api: Override default API selection
            
        Returns:
            Dict containing extracted data and processing metadata
        """
        logger.info(f"Starting optimized receipt processing for {filename}")
        start_time = time.time()
        
        # Check global rate limiting
        if self.enable_rate_limiting and not self.rate_limiter.can_proceed("global"):
            return {
                'error': 'Global rate limit exceeded. Please try again later.',
                'all_errors': ['Global rate limit exceeded'],
                'router_metadata': {
                    'processing_time': 0,
                    'apis_attempted': [],
                    'success': False
                }
            }
        
        # Get optimized API order (fastest and most available first)
        available_apis = self._get_optimized_api_order(preferred_api)
        
        if not available_apis:
            return {
                'error': 'All vision APIs are currently unavailable',
                'all_errors': ['All APIs circuit broken or unavailable'],
                'router_metadata': {
                    'processing_time': time.time() - start_time,
                    'apis_attempted': [],
                    'success': False
                }
            }
        
        # Try APIs with aggressive timeout management for fast failover
        all_errors = []
        attempted_apis = []
        
        for api_name in available_apis:
            logger.info(f"Attempting processing with {api_name}")
            attempted_apis.append(api_name)
            
            try:
                # Set timeout based on receipt complexity for better success rates
                # Detect if this might be a complex receipt
                is_complex_receipt = (
                    'grocery' in filename.lower() or 
                    'costco' in filename.lower() or
                    'warehouse' in filename.lower() or
                    'asda' in filename.lower() or
                    'tesco' in filename.lower() or
                    'sainsbury' in filename.lower() or
                    'cpg' in filename.lower()
                )
                
                timeout_seconds = 150.0 if is_complex_receipt else 60.0  # Longer timeout for complex receipts
                logger.info(f"Using {timeout_seconds}s timeout for {'complex' if is_complex_receipt else 'standard'} receipt")
                
                api_result = await asyncio.wait_for(
                    self._process_with_single_api(api_name, image_file, filename),
                    timeout=timeout_seconds  # Dynamic timeout based on complexity
                )
                
                if api_result and 'error' not in api_result:
                    total_time = time.time() - start_time
                    
                    # Add comprehensive router metadata
                    api_result['router_metadata'] = {
                        'primary_api_used': api_name,
                        'total_processing_time': total_time,
                        'apis_attempted': attempted_apis,
                        'fallback_used': len(attempted_apis) > 1,
                        'cache_hit': api_result.get('router_metadata', {}).get('cache_hit', False),
                        'preferred_api': preferred_api,
                        'success': True
                    }
                    
                    logger.info(f"Receipt processed successfully with {api_name} in {total_time:.2f}s")
                    return api_result
                    
            except asyncio.TimeoutError:
                error_msg = f"API {api_name} timed out after 20s"
                all_errors.append(error_msg)
                logger.error(error_msg)
                
            except Exception as e:
                error_msg = f"API {api_name} failed: {str(e)}"
                all_errors.append(error_msg)
                logger.error(error_msg)
        
        # All APIs failed
        total_time = time.time() - start_time
        logger.error(f"All APIs failed for receipt {filename}")
        
        return {
            'error': f'All APIs failed for receipt {filename}',
            'all_errors': all_errors,
            'router_metadata': {
                'primary_api_used': None,
                'fallback_api_used': None,
                'total_processing_time': total_time,
                'apis_attempted': attempted_apis,
                'all_failed': True,
                'preferred_api': preferred_api,
                'success': False
            },
            'metadata': {
                'confidence': 0,
                'is_receipt': False
            }
        }
    
    async def validate_apis(self) -> Dict[str, bool]:
        """Validate all configured APIs."""
        results = {}
        
        # Validate OpenAI
        try:
            results['openai'] = self.openai_service.validate_api_key()
        except Exception as e:
            logger.error(f"OpenAI validation failed: {str(e)}")
            results['openai'] = False
        
        # Validate XAI Grok
        try:
            results['xai_grok'] = await self.xai_service.validate_api_key()
        except Exception as e:
            logger.error(f"XAI Grok validation failed: {str(e)}")
            results['xai_grok'] = False
        
        return results
    
    def get_api_health_status(self) -> Dict[str, Any]:
        """Get current health status of all APIs."""
        status = {}
        
        for api_name in ['openai', 'xai_grok']:
            cache_key = f"circuit_breaker_{api_name}"
            breaker_data = cache.get(cache_key, {"failures": 0, "last_failure": None})
            
            is_available = self.circuit_breaker.is_api_available(api_name)
            
            status[api_name] = {
                'available': is_available,
                'failures': breaker_data["failures"],
                'last_failure': breaker_data["last_failure"],
                'circuit_breaker_active': not is_available
            }
        
        return status
    
    def get_usage_statistics(self, days: int = 7) -> Dict[str, Any]:
        """Get usage statistics for the last N days."""
        from django.db.models import Sum, Avg
        
        cutoff_date = timezone.now().date() - timedelta(days=days)
        
        stats = APIUsageStats.objects.filter(date__gte=cutoff_date)
        
        summary = {}
        for api_name in ['openai', 'xai_grok']:
            api_stats = stats.filter(api_name=api_name)
            
            totals = api_stats.aggregate(
                total_requests=Sum('requests_count'),
                total_successful=Sum('successful_requests'),
                total_failed=Sum('failed_requests'),
                total_cost=Sum('total_cost_usd'),
                avg_response_time=Avg('average_response_time')
            )
            
            success_rate = 0
            if totals['total_requests']:
                success_rate = (totals['total_successful'] / totals['total_requests']) * 100
            
            summary[api_name] = {
                'total_requests': totals['total_requests'] or 0,
                'successful_requests': totals['total_successful'] or 0,
                'failed_requests': totals['total_failed'] or 0,
                'success_rate_percent': round(success_rate, 2),
                'total_cost_usd': float(totals['total_cost'] or 0),
                'average_response_time': round(totals['avg_response_time'] or 0, 2)
            }
        
        return summary
