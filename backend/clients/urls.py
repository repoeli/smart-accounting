from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'', ClientViewSet)

# URL patterns for the clients app
urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
]