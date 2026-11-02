import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../lib/auth';
import { LoginModal } from '../components/auth/LoginModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../lib/theme';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../lib/api';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('Frontend Authentication System', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('manages session token storage correctly', () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken('test-hmac-token-12345');
    expect(getAuthToken()).toBe('test-hmac-token-12345');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('displays LoginModal when auth is enabled and user is unauthenticated', async () => {
    vi.spyOn(api, 'getAuthStatus').mockResolvedValue({
      auth_enabled: true,
      authenticated: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <LoginModal />
            <div>Protected Content</div>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Operator Access')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter portfolio operator password')).toBeInTheDocument();
      expect(screen.getByText('Unlock System')).toBeInTheDocument();
    });
  });

  it('submits operator password and establishes session', async () => {
    vi.spyOn(api, 'getAuthStatus').mockResolvedValue({
      auth_enabled: true,
      authenticated: false,
    });

    const loginSpy = vi.spyOn(api, 'login').mockResolvedValue({
      success: true,
      message: 'Authenticated successfully',
      expires_at: 9999999999,
      token: 'mock-session-token',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <LoginModal />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter portfolio operator password')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter portfolio operator password');
    fireEvent.change(input, { target: { value: 'CorrectPassword123' } });

    const submitBtn = screen.getByText('Unlock System');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith('CorrectPassword123');
    });
  });

  it('shows error banner when password verification fails', async () => {
    vi.spyOn(api, 'getAuthStatus').mockResolvedValue({
      auth_enabled: true,
      authenticated: false,
    });

    vi.spyOn(api, 'login').mockRejectedValue(new Error('Invalid operator access key.'));

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <LoginModal />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter portfolio operator password')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter portfolio operator password');
    fireEvent.change(input, { target: { value: 'WrongPassword' } });

    const submitBtn = screen.getByText('Unlock System');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid operator access key.')).toBeInTheDocument();
    });
  });

  it('fails closed and displays LoginModal when auth status check encounters an API error', async () => {
    vi.spyOn(api, 'getAuthStatus').mockRejectedValue(new Error('Network error or backend unreachable'));

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <LoginModal />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Operator Access')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter portfolio operator password')).toBeInTheDocument();
    });
  });
});

