from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

def custom_exception_handler(exc, context):
    """
    Custom exception handler for REST framework that provides more detailed error messages.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now, add more specific error handling for different exception types
    if isinstance(exc, DRFValidationError):
        # Handle DRF validation errors
        return Response(
            {'error': 'Validation failed', 'details': exc.detail},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if isinstance(exc, DjangoValidationError):
        # Handle Django's validation errors
        return Response(
            {'error': 'Validation failed', 'details': exc.message_dict},
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, IntegrityError):
        # Handle database integrity errors (e.g., unique constraint violations)
        error_message = str(exc)
        if 'unique constraint' in error_message:
            # Extract the field name from the error message if possible
            field_name = error_message.split('(')[-1].split(')')[0]
            return Response(
                {'error': 'Conflict', 'details': f'An entry with this {field_name} already exists.'},
                status=status.HTTP_409_CONFLICT
            )
        return Response(
            {'error': 'Database integrity error', 'details': str(exc)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # If the exception is not handled above, use the default DRF response
    if response is not None:
        # Customize the default DRF error response format
        if 'detail' in response.data:
            response.data = {'error': 'An error occurred', 'details': response.data['detail']}
        else:
            response.data = {'error': 'An error occurred', 'details': response.data}
    else:
        # For unhandled exceptions, return a generic 500 error
        response = Response(
            {'error': 'Internal Server Error', 'details': 'An unexpected error occurred on the server.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
