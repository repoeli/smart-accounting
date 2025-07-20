import { ApiError } from '../types';

export function handleApiError(error: any): ApiError {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      message: data.message || data.detail || 'An error occurred',
      status,
      errors: data.errors || data
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error - please check your connection',
      status: 0
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0
    };
  }
}

export function getErrorMessage(error: ApiError): string {
  if (error.errors && typeof error.errors === 'object') {
    // Handle Django-style field errors
    const fieldErrors = Object.entries(error.errors)
      .map(([field, messages]) => {
        if (Array.isArray(messages)) {
          return `${field}: ${messages.join(', ')}`;
        }
        return `${field}: ${messages}`;
      })
      .join('\n');
    
    return fieldErrors || error.message;
  }
  
  return error.message;
}
