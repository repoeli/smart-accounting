"""
Cloudinary Service for Receipt Image Storage and Optimization (Free Tier Optimized)
Handles automatic image compression, format conversion, deduplication, and storage
"""

import os
import logging
import hashlib
from typing import Optional, Dict, Any, Union
from io import BytesIO
from PIL import Image
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import cloudinary.api
from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile

logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)


class CloudinaryReceiptService:
    """
    Service for handling receipt image storage with Cloudinary.
    Optimized for free tier with deduplication and size limits.
    """
    
    # Free tier optimized settings
    RECEIPT_FOLDER = os.getenv('CLOUDINARY_RECEIPTS_FOLDER', 'receipts-lite')
    MAX_EDGE = int(os.getenv('CLOUDINARY_MAX_EDGE', '1024'))
    JPEG_QUALITY = int(os.getenv('CLOUDINARY_JPEG_QUALITY', '60'))
    OVERWRITE = bool(int(os.getenv('CLOUDINARY_OVERWRITE', '0')))
    
    def __init__(self):
        self.is_configured = self._check_configuration()
        if not self.is_configured:
            logger.warning("Cloudinary not properly configured, falling back to local storage")

    def _check_configuration(self) -> bool:
        """Check if Cloudinary is properly configured."""
        required_vars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
        return all(os.getenv(var) for var in required_vars)

    def _resize_long_edge(self, img: Image.Image, max_edge: int) -> Image.Image:
        """Resize image maintaining aspect ratio with max edge constraint."""
        w, h = img.size
        if max(w, h) <= max_edge:
            return img
        
        if w >= h:
            new_w = max_edge
            new_h = int(h * (max_edge / w))
        else:
            new_h = max_edge
            new_w = int(w * (max_edge / h))
        
        return img.resize((new_w, new_h), Image.LANCZOS)

    def _prepare_optimized_image(self, file: Union[InMemoryUploadedFile, TemporaryUploadedFile]) -> bytes:
        """Prepare optimized JPEG for upload."""
        file.seek(0)
        
        # Open and convert image
        with Image.open(file) as img:
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize to max edge
            img = self._resize_long_edge(img, self.MAX_EDGE)
            
            # Save as optimized JPEG
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=self.JPEG_QUALITY, optimize=True)
            
            return buffer.getvalue()

    def _generate_content_hash(self, image_data: bytes) -> str:
        """Generate SHA-256 hash for deduplication."""
        return hashlib.sha256(image_data).hexdigest()[:32]

    def upload_receipt_image(
        self, 
        file: Union[InMemoryUploadedFile, TemporaryUploadedFile], 
        receipt_id: int,
        user_id: int,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload receipt image to Cloudinary with optimization and deduplication.
        
        Args:
            file: Uploaded file object
            receipt_id: Receipt ID for organization
            user_id: User ID for organization
            filename: Original filename (optional)
            
        Returns:
            Dict with upload result including URLs and metadata
        """
        if not self.is_configured:
            raise Exception("Cloudinary not configured")
        
        try:
            # Prepare optimized image
            optimized_data = self._prepare_optimized_image(file)
            
            # Generate content-based public ID for deduplication
            content_hash = self._generate_content_hash(optimized_data)
            public_id = f"{self.RECEIPT_FOLDER}/{content_hash}" if self.RECEIPT_FOLDER else content_hash
            
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                optimized_data,
                public_id=public_id,
                resource_type="image",
                format="jpg",
                quality="auto:eco",
                overwrite=self.OVERWRITE,
                tags=[f"user_{user_id}", f"receipt_{receipt_id}", "receipt"],
                context={
                    "user_id": str(user_id),
                    "receipt_id": str(receipt_id),
                    "original_filename": filename or "unknown"
                }
            )
            
            # Generate optimized URLs
            urls = self._generate_optimized_urls(public_id)
            
            logger.info(f"Successfully uploaded receipt {receipt_id} to Cloudinary: {public_id}")
            
            return {
                'success': True,
                'public_id': public_id,
                'original_url': upload_result['secure_url'],
                'urls': urls,
                'size_bytes': len(optimized_data),
                'width': upload_result.get('width'),
                'height': upload_result.get('height'),
                'format': upload_result.get('format'),
                'version': upload_result.get('version'),
                'etag': upload_result.get('etag'),
                'created_at': upload_result.get('created_at')
            }
            
        except Exception as e:
            logger.error(f"Cloudinary upload failed for receipt {receipt_id}: {str(e)}")
            raise Exception(f"Cloudinary upload failed: {str(e)}")

    def _generate_optimized_urls(self, public_id: str) -> Dict[str, str]:
        """Generate URLs for different optimized versions."""
        urls = {}
        
        # Original (no additional transformations)
        urls['original'] = cloudinary.utils.cloudinary_url(
            public_id,
            secure=True,
            resource_type="image"
        )[0]
        
        # Display version (medium size, good quality)
        urls['display'] = cloudinary.utils.cloudinary_url(
            public_id,
            secure=True,
            resource_type="image",
            width=800,
            height=1200,
            crop="limit",
            quality="auto:good",
            format="jpg"
        )[0]
        
        # Thumbnail version (small, for listings)
        urls['thumbnail'] = cloudinary.utils.cloudinary_url(
            public_id,
            secure=True,
            resource_type="image",
            width=300,
            height=400,
            crop="fill",
            gravity="center",
            quality="auto:good",
            format="jpg"
        )[0]
        
        return urls

    def get_optimized_url(
        self, 
        public_id: str, 
        optimization: str = 'display',
        custom_params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Get an optimized URL for an existing image.
        
        Args:
            public_id: Cloudinary public ID
            optimization: Optimization preset ('original', 'display', 'thumbnail')
            custom_params: Custom transformation parameters
            
        Returns:
            Optimized image URL
        """
        if not self.is_configured:
            return ""
        
        try:
            base_params = {
                'secure': True,
                'resource_type': 'image'
            }
            
            if optimization == 'display':
                base_params.update({
                    'width': 800,
                    'height': 1200,
                    'crop': 'limit',
                    'quality': 'auto:good',
                    'format': 'jpg'
                })
            elif optimization == 'thumbnail':
                base_params.update({
                    'width': 300,
                    'height': 400,
                    'crop': 'fill',
                    'gravity': 'center',
                    'quality': 'auto:good',
                    'format': 'jpg'
                })
            # 'original' uses just base_params
            
            if custom_params:
                base_params.update(custom_params)
            
            url, _ = cloudinary.utils.cloudinary_url(public_id, **base_params)
            return url
            
        except Exception as e:
            logger.warning(f"Failed to generate optimized URL for {public_id}: {e}")
            return ""

    def delete_image(self, public_id: str) -> bool:
        """
        Delete an image from Cloudinary.
        
        Args:
            public_id: Cloudinary public ID to delete
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_configured:
            return False
        
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type="image")
            return result.get('result') == 'ok'
        except Exception as e:
            logger.error(f"Failed to delete image {public_id}: {e}")
            return False

    def get_image_info(self, public_id: str) -> Dict[str, Any]:
        """
        Get detailed information about an image.
        
        Args:
            public_id: Cloudinary public ID
            
        Returns:
            Image information dict
        """
        if not self.is_configured:
            return {}
        
        try:
            result = cloudinary.api.resource(public_id, resource_type="image")
            return {
                'public_id': result.get('public_id'),
                'format': result.get('format'),
                'width': result.get('width'),
                'height': result.get('height'),
                'bytes': result.get('bytes'),
                'created_at': result.get('created_at'),
                'url': result.get('secure_url'),
                'version': result.get('version')
            }
        except Exception as e:
            logger.error(f"Failed to get image info for {public_id}: {e}")
            return {}


# Global service instance
cloudinary_service = CloudinaryReceiptService()
