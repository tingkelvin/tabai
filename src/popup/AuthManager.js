// auth.js - Authentication module for Chrome Extension
import { STORAGE_KEYS, API_ENDPOINTS } from "./constants";

const AuthManager = (() => {
  /**
   * Check if user is currently authenticated
   * @returns {Promise<{isAuthenticated: boolean, user: object|null}>}
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
   * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
   */
  const authenticateWithGoogle = async () => {
    try {
      // Get Google OAuth token using Chrome Identity API
      const googleToken = await chrome.identity.getAuthToken({
        interactive: true,
        scopes: ['openid', 'email', 'profile']
      });

      if (!googleToken) {
        throw new Error('Failed to get Google token');
      }

      // Mock response for development
      const response = {
        ok: true,
        json: async () => ({
          bearerToken: 'mock_bearer_token_' + Date.now(),
          user: {
            id: 'mock_user_123',
            email: 'user@example.com',
            name: 'John Doe',
            picture: 'https://via.placeholder.com/100'
          },
          expiresIn: 3600 // 1 hour
        })
      };

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const { bearerToken, user, expiresIn } = await response.json();

      if (!bearerToken || !user) {
        throw new Error('Invalid response from server');
      }

      // Calculate token expiry time
      const tokenExpiry = expiresIn ? Date.now() + (expiresIn * 1000) : null;

      // Store authentication data securely
      await chrome.storage.local.set({
        [STORAGE_KEYS.BEARER_TOKEN]: bearerToken,
        [STORAGE_KEYS.USER_INFO]: user,
        [STORAGE_KEYS.TOKEN_EXPIRY]: tokenExpiry
      });

      return { success: true, user, error: null };

    } catch (error) {
      console.error('Authentication error:', error);
      
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
   * @returns {Promise<boolean>}
   */
  const logout = async () => {
    try {
      // Get current token for backend logout call
      const result = await chrome.storage.local.get([STORAGE_KEYS.BEARER_TOKEN]);
      const { bearerToken } = result;

      // Mock logout response for development
      if (bearerToken) {
        const response = { ok: true };
        if (!response.ok) {
          console.error('Backend logout failed');
        }
      }

      // Clear stored authentication data
      await clearAuthData();
      
      // Revoke Google tokens
      await chrome.identity.clearAllCachedAuthTokens();

      return true;

    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  /**
   * Get current bearer token
   * @returns {Promise<string|null>}
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
   * @param {string} url - API endpoint URL
   * @param {object} options - Fetch options
   * @returns {Promise<Response>}
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
   * @returns {Promise<boolean>}
   */
  const refreshToken = async () => {
    try {
      const token = await getBearerToken();
      
      if (!token) {
        return false;
      }

      // Mock refresh response for development
      const response = {
        ok: true,
        json: async () => ({
          bearerToken: 'refreshed_token_' + Date.now(),
          expiresIn: 3600
        })
      };

      if (!response.ok) {
        await clearAuthData();
        return false;
      }

      const { bearerToken, expiresIn } = await response.json();

      if (bearerToken) {
        const tokenExpiry = expiresIn ? Date.now() + (expiresIn * 1000) : null;
        
        await chrome.storage.local.set({
          [STORAGE_KEYS.BEARER_TOKEN]: bearerToken,
          [STORAGE_KEYS.TOKEN_EXPIRY]: tokenExpiry
        });

        return true;
      }

      return false;

    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  /**
   * Clear all authentication data from storage
   * @private
   */
  const clearAuthData = async () => {
    try {
      await chrome.storage.local.remove([
        STORAGE_KEYS.BEARER_TOKEN,
        STORAGE_KEYS.USER_INFO,
        STORAGE_KEYS.TOKEN_EXPIRY
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  /**
   * Send authentication status to content scripts
   * @param {string} type - Message type
   * @param {object} data - Additional data
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
      console.log('Could not notify content scripts:', error);
    }
  };

  /**
   * Setup authentication event listeners
   */
  const setupEventListeners = () => {
    // Listen for storage changes to sync auth state across extension parts
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        const authKeys = Object.values(STORAGE_KEYS);
        const hasAuthChanges = authKeys.some(key => changes[key]);
        
        if (hasAuthChanges) {
          // Notify content scripts about auth state changes
          notifyContentScripts('AUTH_STATE_CHANGED');
        }
      }
    });

    // Handle runtime messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case 'GET_AUTH_TOKEN':
          getBearerToken().then(token => {
            sendResponse({ token });
          });
          return true; // Indicates async response

        case 'GET_AUTH_STATUS':
          checkAuthStatus().then(status => {
            sendResponse(status);
          });
          return true;

        case 'REFRESH_TOKEN':
          refreshToken().then(success => {
            sendResponse({ success });
          });
          return true;
      }
    });
  };

  // Auto-setup event listeners when module loads
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    setupEventListeners();
  }

  // Return public API
  return {
    checkAuthStatus,
    authenticateWithGoogle,
    logout,
    getBearerToken,
    authenticatedFetch,
    refreshToken,
    notifyContentScripts,
    setupEventListeners
  };
})();

export default AuthManager;