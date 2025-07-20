import os
from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from celery.result import AsyncResult
from .models import Report
from .serializers import ReportCreateSerializer, ReportListSerializer, ReportDetailSerializer
from .tasks import generate_report


class ReportListCreateView(generics.ListCreateAPIView):
    """
    List reports for the authenticated user and create new report generation requests.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Report.objects.filter(owner=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReportCreateSerializer
        return ReportListSerializer
    
    def perform_create(self, serializer):
        # Save the report with the current user as owner
        report = serializer.save(owner=self.request.user)
        
        # Queue the report generation task
        task = generate_report.delay(report.id)
        
        # Store the task ID for tracking
        report.celery_task_id = task.id
        report.save(update_fields=['celery_task_id'])


class ReportDetailView(generics.RetrieveAPIView):
    """
    Retrieve detailed information about a specific report.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReportDetailSerializer
    
    def get_queryset(self):
        return Report.objects.filter(owner=self.request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_status(request, pk):
    """
    Check the status of a report generation task.
    """
    try:
        report = Report.objects.get(pk=pk, owner=request.user)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check Celery task status if available
    if report.celery_task_id:
        task_result = AsyncResult(report.celery_task_id)
        task_status = task_result.status
        task_info = {
            'task_id': report.celery_task_id,
            'task_status': task_status,
            'task_result': task_result.result if task_status == 'SUCCESS' else None,
        }
    else:
        task_info = None
    
    serializer = ReportDetailSerializer(report, context={'request': request})
    
    return Response({
        'report': serializer.data,
        'task_info': task_info
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_report(request, pk):
    """
    Download a completed report file.
    """
    try:
        report = Report.objects.get(pk=pk, owner=request.user)
    except Report.DoesNotExist:
        raise Http404("Report not found")
    
    if not report.is_ready:
        return Response(
            {'error': 'Report is not ready for download'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file_path = os.path.join(settings.MEDIA_ROOT, report.file_path)
    
    if not os.path.exists(file_path):
        return Response(
            {'error': 'Report file not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Determine content type based on format
    if report.format == Report.CSV:
        content_type = 'text/csv'
    elif report.format == Report.PDF:
        content_type = 'application/pdf'
    else:
        content_type = 'application/octet-stream'
    
    # Generate a user-friendly filename
    filename = f"{report.get_report_type_display()}_{report.start_date}_to_{report.end_date}.{report.format}"
    
    response = FileResponse(
        open(file_path, 'rb'),
        content_type=content_type
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_types(request):
    """
    Get available report types and formats.
    """
    return Response({
        'report_types': [
            {'value': choice[0], 'label': choice[1]}
            for choice in Report.REPORT_TYPE_CHOICES
        ],
        'formats': [
            {'value': choice[0], 'label': choice[1]}
            for choice in Report.FORMAT_CHOICES
        ]
    })
