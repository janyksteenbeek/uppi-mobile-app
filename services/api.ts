import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = 'https://3589-62-250-63-239.ngrok-free.app/api';
const USER_AGENT = Platform.OS === 'ios' ? 'UppiApple/1.0' : 'UppiAndroid/1.0';

export interface TokenResponse {
  token: string;
}

export interface ProfileResponse {
  // TODO: Add profile fields based on API response
  id: string;
  // Add other fields as needed
}

class ApiClient {
  private static instance: ApiClient;
  private token: string | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async init() {
    const storedToken = await AsyncStorage.getItem('auth_token');
    // Only set token if it's a non-empty string
    this.token = storedToken && storedToken.trim() ? storedToken : null;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': USER_AGENT,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async login(code: string): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/app/token`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ code: code }),
    });

    if (!response.ok) {
      console.log(response);
      throw new Error('Invalid code');
    }

    const data: TokenResponse = await response.json();
    if (!data.token || !data.token.trim()) {
      throw new Error('Invalid token received');
    }
    
    this.token = data.token;
    await AsyncStorage.setItem('auth_token', data.token);
    return data;
  }

  async getProfile(): Promise<ProfileResponse> {
    if (!this.token) {
      throw new Error('No token available');
    }

    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.token = null;
        await AsyncStorage.removeItem('auth_token');
      }
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  }

  async logout() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token && this.token.trim().length > 0;
  }
}

export const api = ApiClient.getInstance(); 