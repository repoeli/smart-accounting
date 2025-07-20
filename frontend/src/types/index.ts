import { ReactNode } from 'react';

// Authentication Types
export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  company_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  user_type: 'individual' | 'accounting_firm';
  email_verified: boolean;
  subscription_plan: 'basic' | 'premium' | 'platinum';
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  username?: string;
  user_type?: 'individual' | 'accounting_firm';
  company_name?: string;
  phone_number?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  user_type: 'individual' | 'accounting_firm';
  company_name?: string;
  phone_number?: string;
  terms_accepted: boolean;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshToken: () => Promise<void>;
}

// Theme Types
export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

// Component Props Types
export interface ProtectedRouteProps {
  children: ReactNode;
  requiredAuth?: boolean;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}
