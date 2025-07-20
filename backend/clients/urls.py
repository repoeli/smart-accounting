from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet

# Create a router and register the viewset
router = DefaultRouter()
router.register(r'', ClientViewSet, basename='client')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]