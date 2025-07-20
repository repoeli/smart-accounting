from rest_framework import serializers
from django.db import models
from .models import Receipt, Transaction, Category


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Category data.
    """
    can_be_deleted = serializers.ReadOnlyField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'type', 'description', 'owner', 'is_default',
            'created_at', 'updated_at', 'can_be_deleted'
        ]
        read_only_fields = ['id', 'owner', 'is_default', 'created_at', 'updated_at', 'can_be_deleted']
    
    def validate(self, data):
        """
        Custom validation for Category creation/update.
        """
        # Get the user from context
        user = self.context['request'].user
        name = data.get('name')
        category_type = data.get('type')
        
        # Check for duplicate names within the user's categories and same type
        if name and category_type:
            existing_query = Category.objects.filter(
                name__iexact=name,
                type=category_type
            )
            
            # For updates, exclude the current instance
            if self.instance:
                existing_query = existing_query.exclude(id=self.instance.id)
            
            # Check for conflicts with user's categories or defaults
            existing_query = existing_query.filter(
                models.Q(owner=user) | models.Q(is_default=True)
            )
            
            if existing_query.exists():
                raise serializers.ValidationError(
                    f"A {category_type} category with this name already exists."
                )
        
        return data

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
