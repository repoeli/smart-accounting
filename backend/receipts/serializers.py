from rest_framework import serializers
from .models import Receipt, Transaction, Category, Report


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for managing income and expense categories.
    """
    is_system_default = serializers.ReadOnlyField()
    transaction_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'type', 'description', 'is_tax_deductible', 'vat_rate',
            'is_default', 'owner', 'is_system_default', 'transaction_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def get_transaction_count(self, obj):
        """Get the number of transactions using this category"""
        return obj.transactions.count()
    
    def create(self, validated_data):
        # Set the owner to the current user for custom categories
        validated_data['owner'] = self.context['request'].user
        validated_data['is_default'] = False  # User categories are never defaults
        return super().create(validated_data)
    
    def validate(self, data):
        """Custom validation for categories"""
        # Prevent users from creating duplicate category names for the same type
        user = self.context['request'].user
        name = data.get('name', '').strip()
        category_type = data.get('type')
        
        if self.instance:
            # For updates, exclude the current instance from uniqueness check
            existing = Category.objects.filter(
                name__iexact=name,
                type=category_type,
                owner=user
            ).exclude(id=self.instance.id)
        else:
            # For creation, check for any existing category with same name/type
            existing = Category.objects.filter(
                name__iexact=name,
                type=category_type,
                owner=user
            )
        
        if existing.exists():
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
    category_tax_deductible = serializers.BooleanField(source='category.is_tax_deductible', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'receipt', 'vendor_name', 'transaction_date', 'total_amount',
            'currency', 'vat_amount', 'is_vat_registered', 'category', 'category_name',
            'category_type', 'category_tax_deductible', 'is_tax_deductible', 'notes', 
            'line_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'receipt', 'created_at', 'updated_at']
    
    def validate_category(self, value):
        """Ensure the category belongs to the current user or is a default category"""
        user = self.context['request'].user
        if value.owner and value.owner != user:
            raise serializers.ValidationError("You can only use your own categories or default categories")
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


class ReportSerializer(serializers.ModelSerializer):
    """
    Serializer for financial reports generation and management.
    """
    period_description = serializers.ReadOnlyField()
    is_generated = serializers.ReadOnlyField()
    
    class Meta:
        model = Report
        fields = [
            'id', 'owner', 'report_name', 'report_type', 'period_start', 'period_end',
            'file_path', 'file_size', 'format', 'parameters', 'status',
            'created_at', 'generated_at', 'expires_at', 'period_description', 'is_generated'
        ]
        read_only_fields = [
            'id', 'owner', 'file_path', 'file_size', 'status', 'created_at', 
            'generated_at', 'expires_at'
        ]
    
    def create(self, validated_data):
        # Set the owner to the current user
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)
    
    def validate(self, data):
        """Custom validation for reports"""
        period_start = data.get('period_start')
        period_end = data.get('period_end')
        
        if period_start and period_end and period_start > period_end:
            raise serializers.ValidationError("Start date must be before or equal to end date")
        
        return data


class ReportRequestSerializer(serializers.Serializer):
    """
    Serializer for report generation requests with parameters.
    """
    report_name = serializers.CharField(max_length=200)
    report_type = serializers.ChoiceField(choices=Report.REPORT_TYPE_CHOICES)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    format = serializers.ChoiceField(choices=Report.FORMAT_CHOICES, default=Report.PDF)
    
    # Optional filtering parameters
    categories = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="List of category IDs to include in the report"
    )
    include_income = serializers.BooleanField(default=True)
    include_expenses = serializers.BooleanField(default=True)
    min_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    
    def validate(self, data):
        """Validate report request parameters"""
        if data['period_start'] > data['period_end']:
            raise serializers.ValidationError("Start date must be before or equal to end date")
        
        if not data.get('include_income') and not data.get('include_expenses'):
            raise serializers.ValidationError("Must include either income or expenses or both")
        
        min_amount = data.get('min_amount')
        max_amount = data.get('max_amount')
        if min_amount and max_amount and min_amount > max_amount:
            raise serializers.ValidationError("Minimum amount must be less than or equal to maximum amount")
        
        return data