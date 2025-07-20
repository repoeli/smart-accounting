import { api } from './api';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../types';

export const authApi = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/accounts/token/', credentials);
    return { 
      user: response.user, 
      tokens: { 
        access: response.access, 
        refresh: response.refresh 
      } 
    };
  },

  // Register user
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/accounts/register/', data);
    return { 
      user: response.user, 
      tokens: { 
        access: response.access, 
        refresh: response.refresh 
      } 
    };
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await api.get('/accounts/me/');
    return response;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    const response = await api.post('/accounts/token/refresh/', {
      refresh: refreshToken,
    });
    return response;
  },

  // Verify email
  verifyEmail: async (token: string): Promise<void> => {
    await api.post('/accounts/verify-email/', { token });
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<void> => {
    await api.post('/accounts/password/reset/', { email });
  },

  // Confirm password reset
  confirmPasswordReset: async (data: {
    token: string;
    password: string;
    password_confirm: string;
  }): Promise<void> => {
    await api.post('/accounts/password/reset/confirm/', data);
  },

  // Change password
  changePassword: async (data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> => {
    await api.post('/accounts/password/change/', data);
  },

  // Update profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch('/accounts/me/', data);
    return response;
  },

  // Logout (if server-side logout is needed)
  logout: async (): Promise<void> => {
    await api.post('/accounts/logout/', {});
  },
};
