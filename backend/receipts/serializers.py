from rest_framework import serializers
from decimal import Decimal
from .models import Receipt, Transaction, APIUsageStats
from .utils import DecimalEncoder, safe_decimal_to_float, normalize_extracted_data, normalize_processing_metadata


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for Transaction data using new schema.
    """
    class Meta:
        model = Transaction
        fields = [
            'id', 'receipt', 'vendor_name', 'transaction_date', 'total_amount',
            'tax_amount', 'currency', 'transaction_type', 'category',
            'is_vat_registered', 'notes', 'line_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'receipt', 'created_at', 'updated_at']


class APIUsageStatsSerializer(serializers.ModelSerializer):
    """
    Serializer for API usage statistics.
    """
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = APIUsageStats
        fields = [
            'date', 'api_name', 'requests_count', 'successful_requests',
            'failed_requests', 'total_cost_usd', 'average_response_time', 
            'total_tokens', 'success_rate'
        ]
    
    def get_success_rate(self, obj):
        if obj.requests_count > 0:
            return round((obj.successful_requests / obj.requests_count) * 100, 2)
        return 0


class ReceiptSerializer(serializers.ModelSerializer):
    """
    Serializer for Receipt with new OpenAI OCR schema support and Cloudinary integration.
    Handles flat semantic structure and Decimal serialization.
    """
    transaction = TransactionSerializer(read_only=True)
    image_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Receipt
        fields = [
            'id', 'owner', 'file', 'original_filename', 'uploaded_at', 'updated_at',
            'ocr_status', 'ocr_confidence', 'is_auto_approved', 'is_manually_verified',
            'verified_by', 'verified_at', 'extracted_data', 'processing_metadata',
            'processing_errors', 'transaction', 'image_info',
            # Cloudinary fields
            'cloudinary_public_id', 'cloudinary_url', 'cloudinary_display_url',
            'cloudinary_thumbnail_url', 'image_width', 'image_height', 'file_size_bytes'
        ]
        read_only_fields = [
            'id', 'owner', 'original_filename', 'uploaded_at', 'updated_at',
            'ocr_status', 'ocr_confidence', 'is_auto_approved', 'extracted_data',
            'processing_metadata', 'processing_errors', 'image_info',
            # Cloudinary fields are managed by the service
            'cloudinary_public_id', 'cloudinary_url', 'cloudinary_display_url',
            'cloudinary_thumbnail_url', 'image_width', 'image_height', 'file_size_bytes'
        ]
    
    def get_image_info(self, obj):
        """Get comprehensive image information including optimized URLs"""
        return obj.image_info
    
    def to_representation(self, instance):
        """
        Convert model instance to serialized representation.
        Ensures Decimal fields are serializable and follows new schema format.
        Migrates old legacy schema to new flat schema.
        """
        data = super().to_representation(instance)
        
        # Normalize extracted_data for new schema
        if 'extracted_data' in data and data['extracted_data']:
            ed = data['extracted_data']
            
            # Check if this is old legacy schema (has 'vendor' object or 'totals' object)
            if 'vendor' in ed and isinstance(ed['vendor'], dict):
                # Legacy schema - convert to new flat schema
                new_ed = {
                    'vendor': ed.get('vendor', {}).get('name', 'Unknown Vendor'),
                    'date': ed.get('transaction', {}).get('date'),
                    'total': ed.get('totals', {}).get('total', 0),
                    'tax': ed.get('totals', {}).get('tax_amount', 0),
                    'type': ed.get('type', 'expense'),
                    'currency': ed.get('totals', {}).get('currency', 'GBP')
                }
                data['extracted_data'] = new_ed
                ed = new_ed
            
            # Convert Decimal fields to float for JSON serialization
            if isinstance(ed.get('total'), Decimal):
                ed['total'] = float(ed['total'])
            if isinstance(ed.get('tax'), Decimal):
                ed['tax'] = float(ed['tax'])
            if isinstance(ed.get('total_amount'), Decimal):
                ed['total_amount'] = float(ed['total_amount'])
            if isinstance(ed.get('tax_amount'), Decimal):
                ed['tax_amount'] = float(ed['tax_amount'])
            
            # Ensure numeric fields are properly converted
            for field in ['total', 'tax', 'total_amount', 'tax_amount']:
                if field in ed and ed[field] is not None:
                    try:
                        ed[field] = float(ed[field])
                    except (ValueError, TypeError):
                        ed[field] = 0.0
            
            # Ensure all required fields are present for new schema
            ed.setdefault('vendor', ed.get('vendor_name', 'Unknown Vendor'))
            ed.setdefault('date', ed.get('transaction_date'))
            ed.setdefault('total', ed.get('total_amount', 0))
            ed.setdefault('tax', ed.get('tax_amount', 0))
            ed.setdefault('type', ed.get('transaction_type', 'expense'))
            ed.setdefault('currency', ed.get('currency', 'USD'))
            
            # Ensure numeric fields are not None
            if ed.get('total') is None:
                ed['total'] = 0.0
            if ed.get('tax') is None:
                ed['tax'] = 0.0
        
        # Normalize processing_metadata
        if 'processing_metadata' in data and data['processing_metadata']:
            pm = data['processing_metadata']
            
            # Convert Decimal cost to float
            if isinstance(pm.get('cost_usd'), Decimal):
                pm['cost_usd'] = float(pm['cost_usd'])
            
            # Ensure performance fields are present and properly typed
            pm.setdefault('processing_time', pm.get('time_sec', 0))
            pm.setdefault('cost_usd', pm.get('cost_usd', 0))
            pm.setdefault('token_usage', (pm.get('input_tokens', 0) + pm.get('output_tokens', 0)))
            pm.setdefault('segments_processed', pm.get('segments', 1))
            
            # Ensure numeric fields
            for field in ['processing_time', 'cost_usd', 'token_usage', 'segments_processed']:
                if field in pm and pm[field] is not None:
                    try:
                        pm[field] = float(pm[field])
                    except (ValueError, TypeError):
                        pm[field] = 0.0
        
        return data
    
    def create(self, validated_data):
        """Create receipt with current user as owner."""
        validated_data['owner'] = self.context['request'].user
        
        # Set original filename from uploaded file
        if 'file' in validated_data:
            file = validated_data['file']
            validated_data['original_filename'] = file.name
            
        return super().create(validated_data)


class ReceiptUploadSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for receipt uploads.
    Accepts file upload and triggers OpenAI OCR processing.
    """
    class Meta:
        model = Receipt
        fields = ['file']
    
    def validate_file(self, value):
        """Validate uploaded file."""
        # Check file size (50MB limit for complex receipts)
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f'File too large. Maximum size is {max_size/(1024*1024)}MB'
            )
        
        # Check file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f'Unsupported file type. Allowed types: {", ".join(allowed_types)}'
            )
        
        return value
    
    def create(self, validated_data):
        """Create receipt with current user as owner."""
        validated_data['owner'] = self.context['request'].user
        
        # Set original filename from uploaded file
        if 'file' in validated_data:
            file = validated_data['file']
            validated_data['original_filename'] = file.name
            
        return super().create(validated_data)