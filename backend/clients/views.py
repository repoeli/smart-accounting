from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Client
from .serializers import ClientSerializer, ClientListSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing clients.
    Only accounting firms can create and manage clients.
    Clients are automatically scoped to the authenticated firm.
    """
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return clients that belong to the authenticated firm only"""
        if not self.request.user.is_authenticated:
            return Client.objects.none()
        
        # Only return clients for the authenticated firm
        return Client.objects.filter(firm=self.request.user)
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return ClientListSerializer
        return ClientSerializer
    
    def perform_create(self, serializer):
        """Ensure the client is associated with the authenticated firm"""
        # The serializer handles the firm association and limit checking
        serializer.save()
    
    def create(self, request, *args, **kwargs):
        """Create a new client with enhanced error handling"""
        # Check if user is an accounting firm
        if request.user.user_type != request.user.ACCOUNTING_FIRM:
            return Response(
                {'error': 'Only accounting firms can create clients.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def subscription_info(self, request):
        """Get subscription information related to client limits"""
        try:
            subscription = request.user.subscription_details
            current_client_count = self.get_queryset().count()
            
            return Response({
                'current_clients': current_client_count,
                'max_clients': subscription.max_clients,
                'remaining_clients': max(0, subscription.max_clients - current_client_count),
                'subscription_plan': subscription.plan,
                'can_add_clients': current_client_count < subscription.max_clients
            })
        except:
            # If no subscription details, return basic plan info
            current_client_count = self.get_queryset().count()
            max_clients = 5  # Basic plan default
            
            return Response({
                'current_clients': current_client_count,
                'max_clients': max_clients,
                'remaining_clients': max(0, max_clients - current_client_count),
                'subscription_plan': 'basic',
                'can_add_clients': current_client_count < max_clients
            })
