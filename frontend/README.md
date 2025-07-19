# Smart Accounting Frontend

This is the frontend application for the Smart Accounting system. It's built with React and uses Material UI for the UI components.

## Features

- User authentication (register, login, logout)
- Email verification
- Password reset functionality
- Protected routes for authenticated users
- Form validation with Formik and Yup
- Material UI components for a modern UI

## Project Structure

The project follows a clean architecture approach with the following structure:

```
src/
  ├── components/       # Reusable UI components
  │   ├── auth/         # Authentication-related components
  │   └── common/       # Common components used across the app
  ├── contexts/         # React contexts for state management
  ├── hooks/            # Custom React hooks
  ├── pages/            # Page components that render the UI
  │   └── auth/         # Authentication-related pages
  ├── services/         # API services for data fetching
  └── utils/            # Utility functions and helpers
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Build for production:

```bash
npm run build
```

## API Integration

The frontend communicates with the backend API using Axios. The base URL for the API can be configured using the `REACT_APP_API_BASE_URL` environment variable.

## Authentication

The application uses JWT authentication with the following features:

- Token-based authentication
- Automatic token refresh
- Protected routes for authenticated users
- Login, registration, and password reset functionality

## UI Components

The UI is built using Material UI components with a consistent design language across the application.
