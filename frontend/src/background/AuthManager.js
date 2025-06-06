// auth.js - Authentication module for Chrome Extension
import { STORAGE_KEYS } from "../popup/constants";
import { verifyGoogleAccessToken } from "./services/apiServices";
// Simple JWT decoder function (replaces jwt-decode library)
const simpleJwtDecode = (token) => {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = paddedPayload.length % 4;
    const finalPayload = paddedPayload + '='.repeat(padding ? 4 - padding : 0);
    
    // Decode base64 and parse JSON
    const decoded = JSON.parse(atob(finalPayload));
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

const AuthManager = (() => {
  /**
   * Check if user is currently authenticated
   */
  const checkAuthStatus = async () => {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.BEARER_TOKEN,
        STORAGE_KEYS.USER_INFO,
        STORAGE_KEYS.TOKEN_EXPIRY
      ]);

      const { bearerToken, userInfo, tokenExpiry } = result;

      if (!bearerToken || !userInfo) {
        return { isAuthenticated: false, user: null };
      }

      // Check if token is expired
      if (tokenExpiry && Date.now() > tokenExpiry) {
        await clearAuthData();
        return { isAuthenticated: false, user: null };
      }

      return { isAuthenticated: true, user: userInfo };
    } catch (error) {
      console.error('Error checking auth status:', error);
      return { isAuthenticated: false, user: null };
    }
  };

  /**
   * Authenticate user with Google OAuth
   */
  const authenticateWithGoogle = async () => {
    try {
      //console.log('🔐 Starting Google authentication...');
      
      // Get Google OAuth token using Chrome Identity API
      const tokenData = await chrome.identity.getAuthToken({
        interactive: true,
        scopes: ['openid', 'email', 'profile']
      });

      if (!tokenData.token) {
        throw new Error('Failed to get Google access token');
      }

      //console.log('✅ Got Google token');


      const data = await verifyGoogleAccessToken(tokenData.token);
      const bearerToken = data.appSessionToken;
      const user = data.user;

      // For now, we'll skip the API verification and create a mock user
      // TODO: Implement verifyGoogleAccessToken without external dependencies
      
      // Try to extract user info from Google token if it's a JWT
      let userInfo = null;
      const decoded = simpleJwtDecode(bearerToken);
      if (decoded) {
        userInfo = {
          id: decoded.sub || 'unknown',
          email: decoded.email || 'unknown@example.com',
          name: decoded.name || 'Unknown User',
          picture: decoded.picture || null
        };
      } else {
        // Fallback mock user
        userInfo = {
          id: 'google_' + Date.now(),
          email: 'user@gmail.com',
          name: 'Google User',
          picture: null
        };
      }
      
      // Set token expiry
      let tokenExpiry = null;
      if (decoded && decoded.exp) {
        // JWT exp is in seconds, convert to milliseconds
        tokenExpiry = decoded.exp * 1000;
        //console.log('Token expires at:', new Date(tokenExpiry));
        
        // Check if token is already expired
        if (Date.now() >= tokenExpiry) {
          console.warn('Token is already expired!');
        }
      } else {
        // Default expiry: 1 hour from now
        tokenExpiry = Date.now() + (3600 * 1000);
      }

      // Store authentication data securely
      await chrome.storage.local.set({
        [STORAGE_KEYS.BEARER_TOKEN]: bearerToken,
        [STORAGE_KEYS.USER_INFO]: userInfo,
        [STORAGE_KEYS.TOKEN_EXPIRY]: tokenExpiry
      });

      //console.log('✅ Authentication successful:', userInfo);
      return { success: true, user: userInfo, error: null };

    } catch (error) {
      console.error('❌ Authentication error:', error);
      
      // Clear any partial auth data
      await clearAuthData();
      
      return { 
        success: false, 
        user: null, 
        error: error.message || 'Authentication failed' 
      };
    }
  };

  /**
   * Logout user and clear all auth data
   */
  const logout = async () => {
    try {
      //console.log('👋 Logging out...');
      
      // Get current token for potential backend logout call
      const result = await chrome.storage.local.get([STORAGE_KEYS.BEARER_TOKEN]);
      const { bearerToken } = result;

      // TODO: Add actual backend logout call here
      if (bearerToken) {
        //console.log('🔄 Would call backend logout with token:', bearerToken.substring(0, 10) + '...');
      }

      // Clear stored authentication data
      await clearAuthData();
      
      // Revoke Google tokens
      await chrome.identity.clearAllCachedAuthTokens();

      //console.log('✅ Logout successful');
      return true;

    } catch (error) {
      console.error('❌ Logout error:', error);
      return false;
    }
  };

  /**
   * Get current bearer token
   */
  const getBearerToken = async () => {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.BEARER_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY
      ]);

      const { bearerToken, tokenExpiry } = result;

      if (!bearerToken) {
        return null;
      }

      // Check if token is expired
      if (tokenExpiry && Date.now() > tokenExpiry) {
        await clearAuthData();
        return null;
      }

      return bearerToken;
    } catch (error) {
      console.error('Error getting bearer token:', error);
      return null;
    }
  };

  /**
   * Make authenticated API call
   */
  const authenticatedFetch = async (url, options = {}) => {
    const token = await getBearerToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

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
   * Refresh authentication token
   */
  const refreshToken = async () => {
    try {
      const token = await getBearerToken();
      
      if (!token) {
        return false;
      }

      // Mock refresh response for development
      //console.log('🔄 Refreshing token...');
      
      const newBearerToken = 'refreshed_token_' + Date.now();
      const tokenExpiry = Date.now() + (3600 * 1000); // 1 hour from now
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.BEARER_TOKEN]: newBearerToken,
        [STORAGE_KEYS.TOKEN_EXPIRY]: tokenExpiry
      });

      //console.log('✅ Token refreshed');
      return true;

    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  };

  /**
   * Clear all authentication data from storage
   */
  const clearAuthData = async () => {
    try {
      await chrome.storage.local.remove([
        STORAGE_KEYS.BEARER_TOKEN,
        STORAGE_KEYS.USER_INFO,
        STORAGE_KEYS.TOKEN_EXPIRY
      ]);
      //console.log('🧹 Auth data cleared');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  /**
   * Send authentication status to content scripts
   */
  const notifyContentScripts = async (type, data = {}) => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type,
          ...data
        });
      }
    } catch (error) {
      //console.log('Could not notify content scripts:', error);
    }
  };

  //console.log('✅ AuthManager loaded successfully');

  // Return public API
  return {
    checkAuthStatus,
    authenticateWithGoogle,
    logout,
    getBearerToken,
    authenticatedFetch,
    refreshToken,
    notifyContentScripts,
    clearAuthData
  };
})();

export default AuthManager;