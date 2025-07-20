from rest_framework import serializers
from .models import Report


class ReportCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new report generation requests.
    """
    class Meta:
        model = Report
        fields = [
            'report_type',
            'format',
            'start_date',
            'end_date',
            'parameters'
        ]
    
    def validate(self, data):
        """
        Validate the report creation data.
        """
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date:
            if start_date > end_date:
                raise serializers.ValidationError("Start date must be before end date.")
        
        return data


class ReportListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing reports with basic information.
    """
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_ready = serializers.BooleanField(read_only=True)
    is_processing = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Report
        fields = [
            'id',
            'report_type',
            'report_type_display',
            'format',
            'format_display',
            'start_date',
            'end_date',
            'status',
            'status_display',
            'is_ready',
            'is_processing',
            'created_at',
            'completed_at',
            'error_message'
        ]


class ReportDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed report information including download capabilities.
    """
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_ready = serializers.BooleanField(read_only=True)
    is_processing = serializers.BooleanField(read_only=True)
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Report
        fields = [
            'id',
            'report_type',
            'report_type_display',
            'format',
            'format_display',
            'start_date',
            'end_date',
            'status',
            'status_display',
            'is_ready',
            'is_processing',
            'parameters',
            'file_path',
            'download_url',
            'created_at',
            'updated_at',
            'completed_at',
            'error_message'
        ]
    
    def get_download_url(self, obj):
        """
        Generate download URL if the report is ready.
        """
        if obj.is_ready and obj.file_path:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/api/reports/{obj.id}/download/')
        return None