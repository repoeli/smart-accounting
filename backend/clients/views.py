from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Client
from .serializers import ClientSerializer, ClientListSerializer, ClientCreateUpdateSerializer

Account = get_user_model()


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing clients. Only accessible to accounting firms.
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'business_type']
    search_fields = ['first_name', 'last_name', 'email', 'company_name', 'phone_number']
    ordering_fields = ['first_name', 'last_name', 'company_name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Return clients only for the current accounting firm.
        """
        user = self.request.user
        
        # Only accounting firms can access clients
        if user.user_type != Account.ACCOUNTING_FIRM:
            return Client.objects.none()
        
        return Client.objects.filter(accounting_firm=user)
    
    def get_serializer_class(self):
        """
        Return different serializers based on the action.
        """
        if self.action == 'list':
            return ClientListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ClientCreateUpdateSerializer
        return ClientSerializer
    
    @swagger_auto_schema(
        operation_summary="List clients",
        operation_description="Get a list of clients for the current accounting firm",
        manual_parameters=[
            openapi.Parameter(
                'is_active',
                openapi.IN_QUERY,
                description="Filter by active status (true/false)",
                type=openapi.TYPE_BOOLEAN
            ),
            openapi.Parameter(
                'search',
                openapi.IN_QUERY,
                description="Search in name, email, company name, or phone",
                type=openapi.TYPE_STRING
            ),
            openapi.Parameter(
                'ordering',
                openapi.IN_QUERY,
                description="Order by field (first_name, last_name, company_name, created_at, updated_at)",
                type=openapi.TYPE_STRING
            ),
        ],
        responses={
            200: ClientListSerializer(many=True),
            403: "Permission denied - only accounting firms can access"
        }
    )
    def list(self, request, *args, **kwargs):
        """
        List clients with filtering, search, and sorting capabilities.
        """
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Create a new client",
        operation_description="Create a new client for the current accounting firm",
        request_body=ClientCreateUpdateSerializer,
        responses={
            201: ClientSerializer,
            400: "Invalid input data",
            403: "Permission denied - only accounting firms can create clients"
        }
    )
    def create(self, request, *args, **kwargs):
        """
        Create a new client.
        """
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Get client details",
        operation_description="Retrieve detailed information about a specific client",
        responses={
            200: ClientSerializer,
            404: "Client not found",
            403: "Permission denied"
        }
    )
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific client.
        """
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Update client",
        operation_description="Update client information",
        request_body=ClientCreateUpdateSerializer,
        responses={
            200: ClientSerializer,
            400: "Invalid input data",
            404: "Client not found",
            403: "Permission denied"
        }
    )
    def update(self, request, *args, **kwargs):
        """
        Update a client.
        """
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Partially update client",
        operation_description="Partially update client information",
        request_body=ClientCreateUpdateSerializer,
        responses={
            200: ClientSerializer,
            400: "Invalid input data", 
            404: "Client not found",
            403: "Permission denied"
        }
    )
    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a client.
        """
        return super().partial_update(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Delete client",
        operation_description="Delete a client (permanent deletion)",
        responses={
            204: "Client deleted successfully",
            404: "Client not found",
            403: "Permission denied"
        }
    )
    def destroy(self, request, *args, **kwargs):
        """
        Delete a client (permanent deletion).
        """
        return super().destroy(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_summary="Deactivate client",
        operation_description="Deactivate (archive) a client without deleting data",
        responses={
            200: openapi.Response(
                description="Client deactivated successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'client': ClientSerializer
                    }
                )
            ),
            404: "Client not found",
            403: "Permission denied"
        }
    )
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Deactivate (archive) a client.
        """
        client = self.get_object()
        
        if not client.is_active:
            return Response(
                {"message": "Client is already deactivated"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        client.deactivate()
        serializer = self.get_serializer(client)
        
        return Response({
            "message": "Client deactivated successfully",
            "client": serializer.data
        }, status=status.HTTP_200_OK)
    
    @swagger_auto_schema(
        operation_summary="Reactivate client",
        operation_description="Reactivate an archived client",
        responses={
            200: openapi.Response(
                description="Client reactivated successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'client': ClientSerializer
                    }
                )
            ),
            404: "Client not found",
            403: "Permission denied"
        }
    )
    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """
        Reactivate an archived client.
        """
        client = self.get_object()
        
        if client.is_active:
            return Response(
                {"message": "Client is already active"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        client.reactivate()
        serializer = self.get_serializer(client)
        
        return Response({
            "message": "Client reactivated successfully",
            "client": serializer.data
        }, status=status.HTTP_200_OK)
    
    def perform_create(self, serializer):
        """
        Ensure the client is associated with the current accounting firm.
        """
        # Check if user is an accounting firm
        if self.request.user.user_type != Account.ACCOUNTING_FIRM:
            raise PermissionError("Only accounting firms can create clients")
        
        serializer.save(accounting_firm=self.request.user)
    
    def perform_update(self, serializer):
        """
        Ensure the client belongs to the current accounting firm before updating.
        """
        client = self.get_object()
        if client.accounting_firm != self.request.user:
            raise PermissionError("You can only update your own clients")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Ensure the client belongs to the current accounting firm before deleting.
        """
        if instance.accounting_firm != self.request.user:
            raise PermissionError("You can only delete your own clients")
        
        super().perform_destroy(instance)
