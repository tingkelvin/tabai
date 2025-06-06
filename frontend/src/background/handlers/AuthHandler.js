// handlers/AuthHandler.js
import AuthManager from '../AuthManager.js';
import { notificationService } from '../services/NotificationService.js';

export const authHandler = {
  checkAuth: async (sendResponse) => {
    try {
      //console.log('🔍 Checking auth status...');
      
      if (!AuthManager) {
        sendResponse({
          isAuthenticated: false,
          user: null,
          error: 'AuthManager not available'
        });
        return;
      }

      const authStatus = await AuthManager.checkAuthStatus();
      //console.log('✅ Auth status:', authStatus);
      sendResponse(authStatus);
    } catch (error) {
      console.error('❌ Auth check error:', error);
      sendResponse({
        isAuthenticated: false,
        user: null,
        error: error.message
      });
    }
  },

  authenticate: async (sendResponse) => {
    try {
      //console.log('🔐 Authentication requested...');
      
      if (!AuthManager) {
        sendResponse({
          success: false,
          error: 'AuthManager not available'
        });
        return;
      }

      const result = await AuthManager.authenticateWithGoogle();
      
      if (result.success) {
        await AuthManager.notifyContentScripts('AUTH_SUCCESS', { user: result.user });
        notificationService.notifyExtensionParts('AUTH_SUCCESS', { user: result.user });
        
        sendResponse({
          success: true,
          user: result.user,
          message: 'Authentication successful'
        });
      } else {
        notificationService.notifyExtensionParts('AUTH_ERROR', { error: result.error });
        
        sendResponse({
          success: false,
          error: result.error,
          message: 'Authentication failed'
        });
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      
      notificationService.notifyExtensionParts('AUTH_ERROR', { error: error.message });
      
      sendResponse({
        success: false,
        error: error.message,
        message: 'Authentication failed'
      });
    }
  },

  logout: async (sendResponse) => {
    try {
      //console.log('👋 Logout requested...');
      
      if (!AuthManager) {
        sendResponse({
          success: false,
          error: 'AuthManager not available'
        });
        return;
      }

      const success = await AuthManager.logout();
      
      if (success) {
        await AuthManager.notifyContentScripts('AUTH_LOGOUT');
        notificationService.notifyExtensionParts('AUTH_LOGOUT');
        
        sendResponse({
          success: true,
          message: 'Logged out successfully'
        });
      } else {
        sendResponse({
          success: false,
          message: 'Logout failed'
        });
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      sendResponse({
        success: false,
        error: error.message,
        message: 'Logout failed'
      });
    }
  },

  refreshToken: async (sendResponse) => {
    try {
      //console.log('🔄 Token refresh requested...');
      
      if (!AuthManager) {
        sendResponse({ success: false, error: 'AuthManager not available' });
        return;
      }

      const success = await AuthManager.refreshToken();
      sendResponse({ success });
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      sendResponse({ success: false, error: error.message });
    }
  },

  getAuthToken: async (sendResponse) => {
    try {
      if (!AuthManager) {
        sendResponse({ token: null, error: 'AuthManager not available' });
        return;
      }

      const token = await AuthManager.getBearerToken();
      sendResponse({ token });
    } catch (error) {
      sendResponse({ token: null, error: error.message });
    }
  }
};