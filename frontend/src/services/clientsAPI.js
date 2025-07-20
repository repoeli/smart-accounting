import axios from 'axios';

// Create a base API instance
const baseAPI = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
baseAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
baseAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1'}/accounts/token/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          localStorage.setItem('accessToken', access);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return baseAPI(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Create the clients API service
const clientsAPI = {
  // Get all clients for the authenticated firm
  getClients: async () => {
    try {
      const response = await baseAPI.get('/clients/');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Create a new client
  createClient: async (clientData) => {
    try {
      const response = await baseAPI.post('/clients/', clientData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Update an existing client
  updateClient: async (clientId, clientData) => {
    try {
      const response = await baseAPI.put(`/clients/${clientId}/`, clientData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Delete a client
  deleteClient: async (clientId) => {
    try {
      const response = await baseAPI.delete(`/clients/${clientId}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Get subscription information
  getSubscriptionInfo: async () => {
    try {
      const response = await baseAPI.get('/clients/subscription_info/');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },
};

export default clientsAPI;