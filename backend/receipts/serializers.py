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
            'id', 'owner', 'assigned_client', 'file', 'original_filename', 'uploaded_at',
            'ocr_status', 'ocr_text', 'extracted_data', 'ocr_confidence', 'is_auto_approved', 
            'is_manually_verified', 'verified_by', 'verified_at', 'veryfi_document_id', 
            'receipt_date', 'total_amount', 'transaction', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'owner', 'original_filename', 'uploaded_at', 'ocr_status', 'ocr_text',
            'extracted_data', 'ocr_confidence', 'is_auto_approved', 'is_manually_verified',
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
    assigned_client = serializers.IntegerField(required=False, write_only=True)
    
    class Meta:
        model = Receipt
        fields = ['file', 'assigned_client']

    def create(self, validated_data):
        # Remove assigned_client from validated_data as it's handled in the view
        validated_data.pop('assigned_client', None)
        
        # Set the owner to the current user
        validated_data['owner'] = self.context['request'].user
        
        # Set original filename from the uploaded file
        if 'file' in validated_data:
            file = validated_data['file']
            validated_data['original_filename'] = file.name
            
        return super().create(validated_data)
