from rest_framework import serializers
from .models import Receipt, Transaction

class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for Transaction data extracted from receipts.
    """
    class Meta:
        model = Transaction
        fields = [
            'id', 'receipt', 'vendor_name', 'transaction_date', 'total_amount',
            'currency', 'vat_amount', 'is_vat_registered', 'category',
            'is_tax_deductible', 'notes', 'line_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'receipt', 'created_at', 'updated_at']


class ReceiptSerializer(serializers.ModelSerializer):
    """
    Serializer for Receipt uploads and processing.
    """
    transaction = TransactionSerializer(read_only=True)
    receipt_date = serializers.DateField(read_only=True)
    total_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    
    class Meta:
        model = Receipt
        fields = [
            'id', 'owner', 'file', 'original_filename', 'uploaded_at',
            'ocr_status', 'ocr_confidence', 'is_auto_approved', 'is_manually_verified',
            'verified_by', 'verified_at', 'veryfi_document_id', 'receipt_date',
            'total_amount', 'transaction', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'owner', 'original_filename', 'uploaded_at', 'ocr_status', 
            'ocr_confidence', 'is_auto_approved', 'is_manually_verified',
            'verified_by', 'verified_at', 'veryfi_document_id', 'created_at', 'updated_at'
        ]
    
    def create(self, validated_data):
        # Set the owner to the current user
        validated_data['owner'] = self.context['request'].user
        
        # Set original filename from the uploaded file
        if 'file' in validated_data:
            file = validated_data['file']
            validated_data['original_filename'] = file.name
            
        return super().create(validated_data)


class ReceiptUploadSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for Receipt uploads only.
    """
    class Meta:
        model = Receipt
        fields = ['file']

    def create(self, validated_data):
        # Set the owner to the current user
        validated_data['owner'] = self.context['request'].user
        
        # Set original filename from the uploaded file
        if 'file' in validated_data:
            file = validated_data['file']
            validated_data['original_filename'] = file.name
            
        return super().create(validated_data)


class ReceiptReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for receipt review workflow, including transaction data and image URL.
    """
    transaction = TransactionSerializer(read_only=True)
    receipt_date = serializers.DateField(read_only=True)
    total_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    file_url = serializers.SerializerMethodField()
    needs_review = serializers.SerializerMethodField()
    
    class Meta:
        model = Receipt
        fields = [
            'id', 'file_url', 'original_filename', 'uploaded_at',
            'ocr_status', 'ocr_confidence', 'is_auto_approved', 'is_manually_verified',
            'verified_by', 'verified_at', 'receipt_date', 'total_amount', 'transaction',
            'needs_review', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'original_filename', 'uploaded_at', 'ocr_status', 
            'ocr_confidence', 'is_auto_approved', 'is_manually_verified',
            'verified_by', 'verified_at', 'created_at', 'updated_at'
        ]
    
    def get_file_url(self, obj):
        """Return the URL for the receipt image file."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_needs_review(self, obj):
        """Determine if this receipt needs manual review."""
        return (obj.ocr_status == Receipt.COMPLETED and 
                not obj.is_auto_approved and 
                not obj.is_manually_verified)
