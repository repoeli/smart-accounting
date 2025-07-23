"""
Performance optimization utilities for vision API services.
"""
import hashlib
import time
import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from io import BytesIO

from django.core.cache import cache
from django.conf import settings
from PIL import Image

logger = logging.getLogger(__name__)


class ImageCache:
    """Cache for processed images to avoid reprocessing."""
    
    def __init__(self, cache_timeout: int = 3600):  # 1 hour default
        self.cache_timeout = cache_timeout
    
    def _get_image_hash(self, image_file) -> str:
        """Generate hash for image content."""
        image_file.seek(0)
        content = image_file.read()
        image_file.seek(0)
        return hashlib.md5(content).hexdigest()
    
    def get_cached_result(self, image_file, api_name: str) -> Optional[Dict[str, Any]]:
        """Get cached result for image if available."""
        try:
            image_hash = self._get_image_hash(image_file)
            cache_key = f"vision_result_{api_name}_{image_hash}"
            
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for {api_name} with hash {image_hash[:8]}")
                # Update metadata to indicate cache hit
                cached_result['processing_metadata']['cached'] = True
                cached_result['processing_metadata']['cache_hit_time'] = time.time()
                return cached_result
                
        except Exception as e:
            logger.error(f"Error checking cache: {str(e)}")
        
        return None
    
    def cache_result(self, image_file, api_name: str, result: Dict[str, Any]):
        """Cache processing result."""
        try:
            image_hash = self._get_image_hash(image_file)
            cache_key = f"vision_result_{api_name}_{image_hash}"
            
            # Don't cache errors
            if 'error' in result:
                return
            
            # Add caching metadata
            result['processing_metadata']['cached_at'] = time.time()
            result['processing_metadata']['image_hash'] = image_hash
            
            cache.set(cache_key, result, timeout=self.cache_timeout)
            logger.info(f"Cached result for {api_name} with hash {image_hash[:8]}")
            
        except Exception as e:
            logger.error(f"Error caching result: {str(e)}")


class ImageOptimizer:
    """Optimize images for better processing performance."""
    
    @staticmethod
    def optimize_for_vision(image_file, max_size: int = 2048, quality: int = 85) -> BytesIO:
        """Optimize image for vision API processing."""
        try:
            # Create a copy of the file content to avoid file handle issues
            image_file.seek(0)
            image_data = image_file.read()
            image_file.seek(0)
            
            # Work with a new BytesIO object to avoid file handle conflicts
            image_buffer = BytesIO(image_data)
            image = Image.open(image_buffer)
            
            # Convert to RGB if necessary
            if image.mode not in ('RGB', 'L'):
                image = image.convert('RGB')
            
            # Resize if too large
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
                logger.info(f"Image resized to {new_size}")
            
            # Enhance contrast for better OCR
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.2)  # Slight contrast boost
            
            # Save optimized image
            output = BytesIO()
            image.save(output, format='JPEG', quality=quality, optimize=True)
            output.seek(0)
            
            return output
            
        except Exception as e:
            logger.error(f"Error optimizing image: {str(e)}")
            # Return a copy of the original data if optimization fails
            try:
                image_file.seek(0)
                original_data = image_file.read()
                image_file.seek(0)
                return BytesIO(original_data)
            except Exception as fallback_error:
                logger.error(f"Error creating fallback image copy: {str(fallback_error)}")
                # Return an empty BytesIO as last resort
                return BytesIO()


class RateLimiter:
    """Rate limiting for API calls."""
    
    def __init__(self, max_requests_per_minute: int = 60):
        self.max_requests = max_requests_per_minute
        self.window_size = 60  # seconds
    
    def can_proceed(self, identifier: str) -> bool:
        """Check if operation can proceed (alias for can_make_request)."""
        return self.can_make_request(identifier)
    
    def can_make_request(self, api_name: str) -> bool:
        """Check if request can be made within rate limits."""
        cache_key = f"rate_limit_{api_name}"
        current_time = time.time()
        
        # Get request timestamps
        timestamps = cache.get(cache_key, [])
        
        # Remove old timestamps outside the window
        timestamps = [ts for ts in timestamps if current_time - ts < self.window_size]
        
        # Check if under limit
        if len(timestamps) < self.max_requests:
            timestamps.append(current_time)
            cache.set(cache_key, timestamps, timeout=self.window_size)
            return True
        
        logger.warning(f"Rate limit exceeded for {api_name}")
        return False
    
    def get_wait_time(self, api_name: str) -> float:
        """Get time to wait before next request."""
        cache_key = f"rate_limit_{api_name}"
        current_time = time.time()
        
        timestamps = cache.get(cache_key, [])
        if not timestamps:
            return 0
        
        # Find oldest timestamp in current window
        oldest_in_window = min(ts for ts in timestamps if current_time - ts < self.window_size)
        return max(0, self.window_size - (current_time - oldest_in_window))


class PerformanceMonitor:
    """Monitor and log performance metrics."""
    
    @staticmethod
    def log_processing_metrics(api_name: str, processing_time: float, 
                             image_size: tuple, cost: Decimal):
        """Log performance metrics."""
        metrics = {
            'api': api_name,
            'processing_time': processing_time,
            'image_size': image_size,
            'cost_usd': float(cost),
            'timestamp': time.time()
        }
        
        # Log to Django logger
        logger.info(f"Performance metrics: {metrics}")
        
        # Store in cache for monitoring dashboard
        cache_key = f"performance_metrics_{api_name}_{int(time.time())}"
        cache.set(cache_key, metrics, timeout=86400)  # 24 hours
    
    @staticmethod
    def get_recent_performance() -> Dict[str, Dict[str, float]]:
        """Get recent performance data for API optimization."""
        apis = ['openai', 'xai', 'xai_grok']
        performance_data = {}
        
        for api_name in apis:
            metrics = PerformanceMonitor.get_recent_metrics(api_name, hours=1)  # Last hour
            
            if metrics:
                # Calculate average response time
                avg_response_time = sum(m['processing_time'] for m in metrics) / len(metrics)
                total_cost = sum(m['cost_usd'] for m in metrics)
                success_rate = len([m for m in metrics if m['processing_time'] < 60]) / len(metrics)
                
                performance_data[api_name] = {
                    'avg_response_time': avg_response_time,
                    'total_cost': total_cost,
                    'success_rate': success_rate,
                    'request_count': len(metrics)
                }
            else:
                # Default values for APIs with no recent metrics
                performance_data[api_name] = {
                    'avg_response_time': 999,  # High value to put at end of queue
                    'total_cost': 0,
                    'success_rate': 0,
                    'request_count': 0
                }
        
        return performance_data
    
    @staticmethod
    def get_recent_metrics(api_name: str, hours: int = 24) -> list:
        """Get recent performance metrics."""
        current_time = int(time.time())
        start_time = current_time - (hours * 3600)
        
        metrics = []
        for timestamp in range(start_time, current_time, 60):  # Check every minute
            cache_key = f"performance_metrics_{api_name}_{timestamp}"
            metric = cache.get(cache_key)
            if metric:
                metrics.append(metric)
        
        return metrics
