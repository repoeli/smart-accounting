/**
 * Login Page Component
 * User authentication login form
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../hooks';
import { isValidEmail } from '../../utils';

const validationSchema = {
  email: [
    {
      validator: (value) => !!value,
      message: 'Email is required'
    },
    {
      validator: (value) => isValidEmail(value),
      message: 'Please enter a valid email address'
    }
  ],
  password: [
    {
      validator: (value) => !!value,
      message: 'Password is required'
    },
    {
      validator: (value) => value.length >= 8,
      message: 'Password must be at least 8 characters'
    }
  ]
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit
  } = useForm(
    { email: '', password: '' },
    validationSchema
  );

  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (formData) => {
    try {
      console.log('🚀 LoginPage: Starting login process');
      const result = await login(formData);
      console.log('✅ LoginPage: Login completed successfully:', result);
      
      // Wait longer for all state updates and token storage to complete
      console.log('⏳ LoginPage: Waiting for state stabilization before navigation...');
      setTimeout(() => {
        console.log('🧭 LoginPage: Navigating to dashboard');
        navigate(from, { replace: true });
      }, 500); // Increased delay to ensure tokens are ready
    } catch (error) {
      console.error('❌ LoginPage: Login failed:', error);
      // Error handling is done by the AuthContext
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-4 px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit);
          }}
        >
          <div className="space-y-3">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border ${
                  errors.email && touched.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 text-sm`}
                placeholder="Enter your email"
              />
              {errors.email && touched.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3 py-2 pr-10 border ${
                    errors.password && touched.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 text-sm`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && touched.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-500"
            >
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
