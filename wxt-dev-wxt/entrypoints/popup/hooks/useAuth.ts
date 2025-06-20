import { useState, useEffect, useCallback } from 'react';

interface User {
    [key: string]: any;
}

interface AuthResponse {
    success?: boolean;
    user?: User | null;
    isAuthenticated?: boolean;
    error?: string;
}

interface UseAuthReturn {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authError: string | null;
    login: () => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<{ success: boolean; error?: string }>;
    clearError: () => void;
    refreshToken: () => Promise<boolean>;
    checkAuthStatus: () => Promise<void>;
}

const useAuth = (): UseAuthReturn => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [authError, setAuthError] = useState<string | null>(null);

    // Check initial auth status when hook mounts
    useEffect(() => {
        checkAuthStatus();
        setupMessageListener();

        // Cleanup function
        return () => {
            // Remove message listener on cleanup
            if (chrome?.runtime?.onMessage) {
                chrome.runtime.onMessage.removeListener(handleMessage);
            }
        };
    }, []);

    // Message handler function (defined outside useCallback to avoid dependency issues)
    const handleMessage = (message: any, sender: any, sendResponse: any) => {
        switch (message.type) {
            case 'AUTH_STATE_CHANGED':
                // Background script notifies us of auth changes
                checkAuthStatus();
                break;

            case 'AUTH_SUCCESS':
                setUser(message.user);
                setIsAuthenticated(true);
                setIsLoading(false);
                setAuthError(null);
                break;

            case 'AUTH_LOGOUT':
                setUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
                setAuthError(null);
                break;

            case 'AUTH_ERROR':
                setAuthError(message.error);
                setIsLoading(false);
                break;
        }
    };

    // Listen for auth state changes from background script
    const setupMessageListener = useCallback(() => {
        if (chrome?.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener(handleMessage);
        }
    }, []);

    const checkAuthStatus = async (): Promise<void> => {
        try {
            setIsLoading(true);

            // Ask background script for current auth status
            const response = (await sendMessageToBackground('CHECK_AUTH')) as AuthResponse;

            if (response) {
                setIsAuthenticated(!!response.isAuthenticated);
                setUser(response.user ?? null);

                if (response.error) {
                    setAuthError(response.error);
                }
            }
        } catch (error: any) {
            console.error('Error checking auth status:', error);
            setAuthError('Failed to check authentication status');
            // Set default values when connection fails
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true);
            setAuthError(null);

            // Send authentication request to background script
            const response = (await sendMessageToBackground('AUTHENTICATE')) as AuthResponse;

            if (response && response.success) {
                setUser(response.user ?? null);
                setIsAuthenticated(true);
                return { success: true };
            } else {
                const errorMessage = response?.error || 'Login failed';
                setAuthError(errorMessage);
                return { success: false, error: errorMessage };
            }

        } catch (error: any) {
            const errorMessage = error.message || 'Login failed';
            setAuthError(errorMessage);
            console.error('Login error:', error);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async (): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true);
            setAuthError(null);

            // Send logout request to background script
            const response = (await sendMessageToBackground('LOGOUT')) as AuthResponse;

            if (response && response.success) {
                setUser(null);
                setIsAuthenticated(false);
                return { success: true };
            } else {
                const errorMessage = response?.error || 'Logout failed';
                setAuthError(errorMessage);
                return { success: false, error: errorMessage };
            }

        } catch (error: any) {
            const errorMessage = error.message || 'Logout failed';
            setAuthError(errorMessage);
            console.error('Logout error:', error);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => {
        setAuthError(null);
    };

    const refreshToken = async (): Promise<boolean> => {
        try {
            // Ask background script to refresh token
            const response = (await sendMessageToBackground('REFRESH_TOKEN')) as AuthResponse;

            if (response && response.success) {
                return true;
            } else {
                // Token refresh failed, user needs to login again
                setUser(null);
                setIsAuthenticated(false);
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            setUser(null);
            setIsAuthenticated(false);
            return false;
        }
    };

    // Helper function to send messages to background script
    const sendMessageToBackground = (type: string, data: Record<string, any> = {}): Promise<AuthResponse> => {
        return new Promise((resolve, reject) => {
            // Check if chrome runtime is available
            if (!chrome?.runtime?.sendMessage) {
                reject(new Error('Chrome runtime not available'));
                return;
            }

            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                reject(new Error('Message timeout'));
            }, 10000); // 10 second timeout

            try {
                chrome.runtime.sendMessage({ type, data }, (response: AuthResponse) => {
                    clearTimeout(timeout);

                    if (chrome.runtime.lastError) {
                        console.error('Chrome runtime error:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    };

    return {
        // State
        user,
        isAuthenticated,
        isLoading,
        authError,

        // Actions
        login,
        logout,
        clearError,
        refreshToken,
        checkAuthStatus
    };
};

export default useAuth; 