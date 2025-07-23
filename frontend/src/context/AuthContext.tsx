import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContextType, User, LoginCredentials, RegisterData } from '../types';
import { authApi } from '../services/authApiTS';
import { TokenStorage } from '../services/api';
import { handleApiError } from '../utils/errorHandler';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: any;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    TokenStorage.removeTokens();
    setUser(null);
    setError(null);
    console.log('Logged out successfully');
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authApi.login(credentials);
      
      // Store tokens
      TokenStorage.setTokens(response.tokens.access, response.tokens.refresh);
      
      // Set user
      setUser(response.user);
      
      console.log('Login successful!');
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      console.error('Login error:', apiError.message);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authApi.register(data);
      
      // Store tokens
      TokenStorage.setTokens(response.tokens.access, response.tokens.refresh);
      
      // Set user
      setUser(response.user);
      
      console.log('Registration successful!');
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      console.error('Registration error:', apiError.message);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = TokenStorage.getRefreshToken();
      if (!refreshTokenValue) {
        logout();
        return;
      }

      const response = await authApi.refreshToken(refreshTokenValue);
      TokenStorage.setAccessToken(response.access);
    } catch (err: any) {
      logout();
      throw handleApiError(err);
    }
  }, [logout]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = TokenStorage.getAccessToken();
        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        // Try to get user profile
        const userProfile = await authApi.getProfile();
        setUser(userProfile);
      } catch (err: any) {
        // Token might be expired, try to refresh
        try {
          await refreshToken();
          const userProfile = await authApi.getProfile();
          setUser(userProfile);
        } catch (refreshErr: any) {
          // Refresh failed, logout
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [refreshToken, logout]);

  const isAuthenticated = !!user && !!TokenStorage.getAccessToken();

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
