from rest_framework import serializers
from .models import Receipt, Transaction, Category


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for custom user categories.
    """
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'type', 'description', 'is_default', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_default', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Set the user to the current user
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def validate(self, data):
        # Check for duplicate category names for the same user and type
        user = self.context['request'].user
        name = data.get('name')
        category_type = data.get('type')
        
        # For update operations, exclude the current instance
        queryset = Category.objects.filter(user=user, name=name, type=category_type)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        
        if queryset.exists():
            raise serializers.ValidationError(
                f"You already have a {category_type} category named '{name}'"
            )
        
        return data


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for Transaction data extracted from receipts.
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_type = serializers.CharField(source='category.type', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'receipt', 'vendor_name', 'transaction_date', 'total_amount',
            'currency', 'vat_amount', 'is_vat_registered', 'category', 'category_name', 'category_type',
            'is_tax_deductible', 'notes', 'line_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'receipt', 'category_name', 'category_type', 'created_at', 'updated_at']
    
    def validate_category(self, value):
        """Ensure the category belongs to the current user"""
        user = self.context['request'].user
        if value.user != user:
            raise serializers.ValidationError("You can only assign categories that belong to you")
        return value


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
