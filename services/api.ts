import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = 'https://3589-62-250-63-239.ngrok-free.app/api';
const USER_AGENT = Platform.OS === 'ios' ? 'UppiApple/1.0' : 'UppiAndroid/1.0';
const TOKEN_KEY = '@uppi_auth_token';

export interface TokenResponse {
  token: string;
}

export interface Check {
  id: string;
  monitor_id: string;
  status: 'ok' | 'fail';
  response_time: number | null;
  response_code: number;
  output: string;
  checked_at: string;
  created_at: string;
  updated_at: string;
  anomaly_id: string | null;
}

export interface Anomaly {
  id: string;
  monitor_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Monitor {
  id: string;
  user_id: string;
  type: 'http' | 'tcp';
  address: string;
  port: number | null;
  name: string;
  body: string | null;
  expects: string | null;
  is_enabled: boolean;
  interval: number;
  consecutive_threshold: number;
  status: 'ok' | 'fail';
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  last_check: Check;
  anomalies: Anomaly[];
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  email_verified_at: string;
  created_at: string;
  updated_at: string;
  is_admin: number;
}

export interface PaginationLinks {
  url: string | null;
  label: string;
  active: boolean;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: PaginationLinks[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface AnomalyWithMonitor extends Anomaly {
  monitor: Monitor;
  checks: Check[];
}

class ApiClient {
  private static instance: ApiClient;
  private token: string | null = null;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      this.token = storedToken && storedToken.trim() ? storedToken.trim() : null;
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load token:', error);
      this.token = null;
    }
  }

  private async getHeaders(): Promise<HeadersInit> {
    // Ensure token is loaded
    if (!this.initialized) {
      await this.init();
    }

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
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Invalid code');
    }

    const data: TokenResponse = await response.json();
    if (!data.token || !data.token.trim()) {
      throw new Error('Invalid token received');
    }
    
    this.token = data.token.trim();
    await AsyncStorage.setItem(TOKEN_KEY, this.token);
    return data;
  }

  async getMonitors(): Promise<Monitor[]> {
    const response = await fetch(`${API_BASE_URL}/monitors`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.logout();
      }
      throw new Error('Failed to fetch monitors');
    }

    return response.json();
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
        await this.logout();
      }
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  }

  async logout() {
    this.token = null;
    this.initialized = false;
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.token && this.token.trim().length > 0;
  }

  async getAnomalies(page: number = 1): Promise<PaginatedResponse<AnomalyWithMonitor>> {
    const response = await fetch(`${API_BASE_URL}/anomalies?page=${page}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.logout();
      }
      throw new Error('Failed to fetch anomalies');
    }

    return response.json();
  }

  async getMonitorDetail(id: string): Promise<Monitor> {
    const response = await fetch(`${API_BASE_URL}/monitors/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.logout();
      }
      throw new Error('Failed to fetch monitor details');
    }

    return response.json();
  }

  async getAnomalyDetail(id: string): Promise<AnomalyWithMonitor> {
    const response = await fetch(`${API_BASE_URL}/anomalies/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.logout();
      }
      throw new Error('Failed to fetch anomaly details');
    }

    return response.json();
  }
}

export const api = ApiClient.getInstance(); 