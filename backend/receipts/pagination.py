"""
Custom pagination for receipts API
"""
from rest_framework.pagination import PageNumberPagination


class ReceiptPagination(PageNumberPagination):
    """
    Custom pagination class for receipts that allows larger page sizes
    """
    page_size = 100  # Default page size
    page_size_query_param = 'page_size'  # Allow client to set page size via ?page_size=X
    max_page_size = 1000  # Maximum page size to prevent abuse
    
    def get_page_size(self, request):
        """
        Allow clients to set page size up to max_page_size
        """
        if self.page_size_query_param:
            try:
                page_size = int(request.query_params[self.page_size_query_param])
                if page_size > 0:
                    return min(page_size, self.max_page_size)
            except (KeyError, ValueError):
                pass
        
        return self.page_size
