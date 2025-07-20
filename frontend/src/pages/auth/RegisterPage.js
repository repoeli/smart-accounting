/**
 * Register Page Component
 * User registration form with validation and error handling
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  first_name: [
    {
      validator: (value) => !!value,
      message: 'First name is required'
    },
    {
      validator: (value) => value.length >= 2,
      message: 'First name must be at least 2 characters'
    }
  ],
  last_name: [
    {
      validator: (value) => !!value,
      message: 'Last name is required'
    },
    {
      validator: (value) => value.length >= 2,
      message: 'Last name must be at least 2 characters'
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
  ],
  password_confirm: [
    {
      validator: (value, formData) => value === formData.password,
      message: 'Passwords do not match'
    }
  ]
};

function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit
  } = useForm(
    {
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: ''
    },
    validationSchema
  );

  const onSubmit = async (formData) => {
    try {
      // Clear any previous errors
      setSubmitError(null);
      setFieldErrors({});
      clearError();

      console.log('Submitting registration data:', formData);

      // Call register function from AuthContext
      await register(formData);
      
      // If we reach here, registration was successful
      // The AuthContext.register function will handle navigation to /verify-email-sent
      console.log('Registration successful');
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle different types of errors
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle field-specific errors
        if (errorData.email) {
          setFieldErrors(prev => ({ ...prev, email: errorData.email[0] }));
        }
        if (errorData.first_name) {
          setFieldErrors(prev => ({ ...prev, first_name: errorData.first_name[0] }));
        }
        if (errorData.last_name) {
          setFieldErrors(prev => ({ ...prev, last_name: errorData.last_name[0] }));
        }
        if (errorData.password) {
          setFieldErrors(prev => ({ ...prev, password: errorData.password[0] }));
        }
        if (errorData.password_confirm) {
          setFieldErrors(prev => ({ ...prev, password_confirm: errorData.password_confirm[0] }));
        }
        
        // Handle general error message
        if (errorData.detail || errorData.non_field_errors) {
          setSubmitError(errorData.detail || errorData.non_field_errors[0]);
        } else if (!Object.keys(errorData).some(key => ['email', 'first_name', 'last_name', 'password', 'password_confirm'].includes(key))) {
          setSubmitError('Registration failed. Please check your information and try again.');
        }
      } else {
        setSubmitError(error.message || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-4 px-4">
      <div className="w-full max-w-sm mx-auto space-y-4">
        <div>
          <h2 className="text-center text-xl font-bold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit);
          }}
        >
          {/* Global Error Message */}
          {(submitError || error) && (
            <div className="rounded-md bg-red-50 p-3 mb-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2">
                  <p className="text-sm text-red-800">
                    {submitError || error}
                  </p>
                </div>
              </div>
            </div>
          )}

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

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="first_name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={values.first_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3 py-2 border ${
                    errors.first_name && touched.first_name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 text-sm`}
                  placeholder="First name"
                />
                {errors.first_name && touched.first_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={values.last_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3 py-2 border ${
                    errors.last_name && touched.last_name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 text-sm`}
                  placeholder="Last name"
                />
                {errors.last_name && touched.last_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.last_name}</p>
                )}
              </div>
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
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="password_confirm" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={values.password_confirm}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3 py-2 pr-10 border ${
                    errors.password_confirm && touched.password_confirm
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 text-sm`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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
              {errors.password_confirm && touched.password_confirm && (
                <p className="mt-1 text-xs text-red-600">{errors.password_confirm}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
