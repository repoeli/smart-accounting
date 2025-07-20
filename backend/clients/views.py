from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Client
from .serializers import ClientSerializer, ClientListSerializer, ClientCreateSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing clients.
    Only accessible to accounting firm users.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return clients for the current accounting firm only.
        """
        user = self.request.user
        
        # Only accounting firms can access client management
        if user.user_type != 'accounting_firm':
            return Client.objects.none()
        
        return Client.objects.filter(accounting_firm=user)
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'list':
            return ClientListSerializer
        elif self.action == 'create':
            return ClientCreateSerializer
        return ClientSerializer
    
    def perform_create(self, serializer):
        """
        Create a new client for the current accounting firm.
        """
        serializer.save(accounting_firm=self.request.user)
    
    @swagger_auto_schema(
        operation_summary="List all clients",
        operation_description="Get a list of all clients for the current accounting firm",
        manual_parameters=[
            openapi.Parameter(
                'active_only',
                openapi.IN_QUERY,
                description="Filter to show only active clients",
                type=openapi.TYPE_BOOLEAN,
                default=False
            )
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        List clients with optional filtering.
        """
        queryset = self.get_queryset()
        
        # Filter by active status if requested
        active_only = request.query_params.get('active_only', 'false').lower() == 'true'
        if active_only:
            queryset = queryset.filter(is_active=True)
        
        # Apply ordering
        queryset = queryset.order_by('company_name')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_summary="Create a new client",
        operation_description="Create a new client for the current accounting firm",
        request_body=ClientCreateSerializer,
        responses={
            201: ClientSerializer,
            400: "Invalid input data",
            403: "Only accounting firms can create clients"
        }
    )
    def create(self, request, *args, **kwargs):
        """
        Create a new client.
        """
        # Check user type
        if request.user.user_type != 'accounting_firm':
            return Response(
                {"detail": "Only accounting firms can create clients."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Get client details",
        operation_description="Get detailed information about a specific client"
    )
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve client details.
        """
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Update client information",
        operation_description="Update information for an existing client"
    )
    def update(self, request, *args, **kwargs):
        """
        Update client information.
        """
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Partially update client information",
        operation_description="Partially update information for an existing client"
    )
    def partial_update(self, request, *args, **kwargs):
        """
        Partially update client information.
        """
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    @swagger_auto_schema(
        operation_summary="Deactivate a client",
        operation_description="Mark a client as inactive instead of deleting them",
        responses={
            200: "Client deactivated successfully",
            400: "Client is already inactive",
            404: "Client not found"
        }
    )
    def deactivate(self, request, pk=None):
        """
        Deactivate a client instead of deleting them.
        """
        client = self.get_object()
        
        if not client.is_active:
            return Response(
                {"detail": "Client is already inactive."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        client.deactivate()
        serializer = self.get_serializer(client)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    @swagger_auto_schema(
        operation_summary="Reactivate a client",
        operation_description="Mark an inactive client as active again",
        responses={
            200: "Client reactivated successfully",
            400: "Client is already active",
            404: "Client not found"
        }
    )
    def reactivate(self, request, pk=None):
        """
        Reactivate an inactive client.
        """
        client = self.get_object()
        
        if client.is_active:
            return Response(
                {"detail": "Client is already active."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        client.reactivate()
        serializer = self.get_serializer(client)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    @swagger_auto_schema(
        operation_summary="Get client statistics",
        operation_description="Get statistics about clients for the current accounting firm",
        responses={
            200: openapi.Response(
                description="Client statistics",
                examples={
                    "application/json": {
                        "total_clients": 25,
                        "active_clients": 23,
                        "inactive_clients": 2,
                        "vat_registered_clients": 18,
                        "business_types": {
                            "limited_company": 15,
                            "sole_trader": 8,
                            "partnership": 2
                        }
                    }
                }
            )
        }
    )
    def stats(self, request):
        """
        Get statistics about clients.
        """
        queryset = self.get_queryset()
        
        total_clients = queryset.count()
        active_clients = queryset.filter(is_active=True).count()
        inactive_clients = queryset.filter(is_active=False).count()
        vat_registered_clients = queryset.exclude(vat_number__isnull=True).exclude(vat_number__exact='').count()
        
        # Business type breakdown
        business_types = {}
        for choice_value, choice_label in Client.BUSINESS_TYPE_CHOICES:
            count = queryset.filter(business_type=choice_value).count()
            if count > 0:
                business_types[choice_value] = count
        
        stats_data = {
            "total_clients": total_clients,
            "active_clients": active_clients,
            "inactive_clients": inactive_clients,
            "vat_registered_clients": vat_registered_clients,
            "business_types": business_types,
        }
        
        return Response(stats_data)
