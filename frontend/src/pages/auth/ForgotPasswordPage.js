/**
 * Forgot Password Page Component
 * Password reset request form
 */

import React from 'react';
import { Link } from 'react-router-dom';
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
  ]
};

function ForgotPasswordPage() {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit
  } = useForm({ email: '' }, validationSchema);

  const onSubmit = async (formData) => {
    // TODO: Implement password reset API call
    console.log('Password reset requested for:', formData.email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit);
          }}
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                errors.email && touched.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              } placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 sm:text-sm`}
              placeholder="Enter your email"
            />
            {errors.email && touched.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending reset link...
                </div>
              ) : (
                'Send reset link'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
