// useAuth.ts
import { sendMessage } from '@/entrypoints/background/types/messages';
import { CheckAuthResponse, AuthenticateResponse, BaseResponse } from '@/entrypoints/background/types/responses';
import { useState, useEffect, useCallback } from 'react';

interface User {
    [key: string]: any;
}

interface UseAuthReturn {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authError: string | null;
    login: () => Promise<BaseResponse>;
    logout: () => Promise<BaseResponse>;
    clearError: () => void;
    checkAuthStatus: () => Promise<void>;
}

const useAuth = (): UseAuthReturn => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const handleMessage = useCallback((message: any) => {
        switch (message.type) {
            case 'AUTH_STATE_CHANGED':
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
    }, []);

    useEffect(() => {
        checkAuthStatus();

        if (chrome?.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener(handleMessage);
            return () => chrome.runtime.onMessage.removeListener(handleMessage);
        }
    }, [handleMessage]);

    const checkAuthStatus = async (): Promise<void> => {
        try {
            setIsLoading(true);
            const response: CheckAuthResponse = await sendMessage('checkAuth');

            setIsAuthenticated(response.isAuthenticated);
            setUser(response.user ?? null);
            setAuthError(response.error || null);
        } catch (error) {
            setAuthError('Failed to check authentication status');
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (): Promise<BaseResponse> => {
        try {
            setIsLoading(true);
            setAuthError(null);

            const response: AuthenticateResponse = await sendMessage('authenticate');

            if (response.success) {
                setUser(response.user ?? null);
                setIsAuthenticated(true);
                return { success: true };
            } else {
                const errorMessage = response.error || 'Login failed';
                setAuthError(errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Login failed';
            setAuthError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async (): Promise<BaseResponse> => {
        try {
            setIsLoading(true);
            setAuthError(null);

            const response: BaseResponse = await sendMessage('logout');

            if (response.success) {
                setUser(null);
                setIsAuthenticated(false);
                return { success: true };
            } else {
                const errorMessage = response.error || 'Logout failed';
                setAuthError(errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Logout failed';
            setAuthError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => {
        setAuthError(null);
    };

    return {
        user,
        isAuthenticated,
        isLoading,
        authError,
        login,
        logout,
        clearError,
        checkAuthStatus
    };
};

export default useAuth;