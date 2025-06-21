// AuthManager.ts - Authentication module for Chrome Extension

import { verifyGoogleAccessToken } from "../services/apiServices";
import { GoogleVerifyTokenResponse } from '../types/ApiResponses';
import { GoogleUserInfo, JWTPayload } from "../types/auth";
import { CheckAuthResponse, AuthenticateResponse, GetAuthTokenResponse, BaseResponse } from "../types/responses";

// Define storage schema
const authStorage = {
    bearerToken: storage.defineItem<string>('local:bearerToken'),
    userInfo: storage.defineItem<GoogleUserInfo>('local:userInfo'),
    tokenExpiry: storage.defineItem<number>('local:tokenExpiry')
};

// Simple JWT decoder function
const simpleJwtDecode = (token: string): JWTPayload | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT format');

        const payload = parts[1];
        const paddedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padding = paddedPayload.length % 4;
        const finalPayload = paddedPayload + '='.repeat(padding ? 4 - padding : 0);

        return JSON.parse(atob(finalPayload));
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
};

const AuthManager = (() => {
    /**
     * Clear all authentication data from storage
     */
    const clearAuthData = async (): Promise<void> => {
        try {
            await Promise.all([
                authStorage.bearerToken.removeValue(),
                authStorage.userInfo.removeValue(),
                authStorage.tokenExpiry.removeValue()
            ]);
            console.log('🧹 Auth data cleared');
        } catch (error) {
            console.error('Error clearing auth data:', error);
        }
    };

    /**
     * Check if user is currently authenticated
     */
    const checkAuthStatus = async (): Promise<CheckAuthResponse> => {
        try {
            const [bearerToken, userInfo, tokenExpiry] = await Promise.all([
                authStorage.bearerToken.getValue(),
                authStorage.userInfo.getValue(),
                authStorage.tokenExpiry.getValue()
            ]);

            if (!bearerToken || !userInfo) {
                return {
                    success: true,
                    isAuthenticated: false,
                    user: null,
                };
            }

            if (tokenExpiry && Date.now() > tokenExpiry) {
                await clearAuthData();
                return {
                    success: true,
                    isAuthenticated: false,
                    user: null,
                    error: 'Session expired, please log in again'
                };
            }

            return {
                success: true,
                isAuthenticated: true,
                user: userInfo
            };
        } catch (error) {
            return {
                success: false,
                isAuthenticated: false,
                user: null,
                error: 'Unknown error'
            };
        }
    };

    /**
     * Authenticate user with Google OAuth
     */
    const authenticateWithGoogle = async (): Promise<AuthenticateResponse> => {
        try {
            console.log('🔐 Starting Google authentication...');

            const { token } = await chrome.identity.getAuthToken({
                interactive: true,
                scopes: ['openid', 'email', 'profile']
            });

            if (!token) {
                throw new Error('Failed to get Google access token');
            }

            const { appSessionToken } = await verifyGoogleAccessToken(token) as GoogleVerifyTokenResponse;

            let userInfo: GoogleUserInfo;
            const decoded = simpleJwtDecode(appSessionToken);

            if (decoded) {
                userInfo = {
                    id: decoded.sub || 'unknown',
                    email: decoded.email || 'unknown@example.com',
                    name: decoded.name || 'Unknown User',
                    picture: decoded.picture || 'Unknow Picture'
                };
            } else {
                userInfo = {
                    id: 'google_' + Date.now(),
                    email: 'user@gmail.com',
                    name: 'Google User',
                    picture: 'Google User Picture'
                };
            }

            const tokenExpiry = decoded?.exp
                ? decoded.exp * 1000
                : Date.now() + (3600 * 1000);

            if (decoded?.exp && Date.now() >= tokenExpiry) {
                console.warn('Token is already expired!');
            }

            // Store authentication data
            await Promise.all([
                authStorage.bearerToken.setValue(appSessionToken),
                authStorage.userInfo.setValue(userInfo),
                authStorage.tokenExpiry.setValue(tokenExpiry)
            ]);

            console.log('✅ Authentication successful:', userInfo);
            return { success: true, user: userInfo };

        } catch (error) {
            console.error('❌ Authentication error:', error);
            await clearAuthData();
            return {
                success: false,
                user: null,
                error: 'Authentication failed'
            };
        }
    };

    /**
     * Logout user and clear all auth data
     */
    const logout = async (): Promise<BaseResponse> => {
        try {
            console.log('👋 Logging out...');

            const bearerToken = await authStorage.bearerToken.getValue();

            // TODO: Add backend logout call
            if (bearerToken) {
                console.log('🔄 Would call backend logout with token:', bearerToken.substring(0, 10) + '...');
            }

            // Clear chat settings and auth data
            const chatSettings = storage.defineItem<any>('sync:chatSettings');
            await Promise.all([
                chatSettings.setValue({ hasGreeting: false }),
                clearAuthData(),
                chrome.identity.clearAllCachedAuthTokens()
            ]);

            console.log('✅ Logout successful');
            return { success: true };
        } catch (error) {
            console.error('❌ Logout error:', error);
            return { success: false, error: 'Logout failed' };
        }
    };

    /**
     * Get current bearer token
     */
    const getAuthToken = async (): Promise<GetAuthTokenResponse> => {
        try {
            const [bearerToken, tokenExpiry] = await Promise.all([
                authStorage.bearerToken.getValue(),
                authStorage.tokenExpiry.getValue()
            ]);

            if (!bearerToken) return { success: false, bearerToken: "" };

            if (tokenExpiry && Date.now() > tokenExpiry) {
                await clearAuthData();
                return { success: false, bearerToken: "" };
            }

            return { success: true, bearerToken };
        } catch (error) {
            console.error('Error getting bearer token:', error);
            return { success: false, bearerToken: "" };
        }
    };

    /**
     * Make authenticated API call
     */
    const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const token = await getAuthToken();
        if (!token) throw new Error('Authenication failed, please log in again');

        return fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    };

    /**
     * Send authentication status to content scripts
     */
    const notifyContentScripts = async (type: string, data: Record<string, any> = {}): Promise<void> => {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
                await chrome.tabs.sendMessage(tabs[0].id, { type, ...data });
            }
        } catch (error) {
            console.log('Could not notify content scripts:', error);
        }
    };

    console.log('✅ AuthManager loaded successfully');

    return {
        checkAuthStatus,
        authenticateWithGoogle,
        logout,
        getAuthToken,
        authenticatedFetch,
        notifyContentScripts,
        clearAuthData
    };
})();

export default AuthManager;