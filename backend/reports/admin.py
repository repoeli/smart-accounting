from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'owner',
        'report_type',
        'format',
        'start_date',
        'end_date',
        'status',
        'created_at',
        'completed_at'
    ]
    list_filter = [
        'report_type',
        'format',
        'status',
        'created_at'
    ]
    search_fields = [
        'owner__email',
        'owner__first_name',
        'owner__last_name'
    ]
    readonly_fields = [
        'celery_task_id',
        'file_path',
        'created_at',
        'updated_at',
        'completed_at'
    ]
    
    fieldsets = (
        ('Report Information', {
            'fields': ('owner', 'report_type', 'format', 'start_date', 'end_date')
        }),
        ('Processing', {
            'fields': ('status', 'celery_task_id', 'file_path', 'error_message')
        }),
        ('Metadata', {
            'fields': ('parameters',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        })
    )
