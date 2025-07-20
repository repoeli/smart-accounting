// Mock API service for testing without external dependencies
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Token storage utilities
export class TokenStorage {
  private static ACCESS_TOKEN_KEY = 'access_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  static removeTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }
}

// Simple fetch-based API client
export const api = {
  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TokenStorage.getAccessToken() ? `Bearer ${TokenStorage.getAccessToken()}` : '',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': TokenStorage.getAccessToken() ? `Bearer ${TokenStorage.getAccessToken()}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async patch(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TokenStorage.getAccessToken() ? `Bearer ${TokenStorage.getAccessToken()}` : '',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

export default api;
