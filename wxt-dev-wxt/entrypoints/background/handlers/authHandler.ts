// handlers/AuthHandler.ts
import AuthManager from '../AuthManager.js';
import { notificationService } from '../services/NotificationService.js';

interface AuthStatus {
  isAuthenticated: boolean;
  user: any;
  error?: string;
}

interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  message?: string;
}

interface TokenResult {
  token: string | null;
  error?: string;
}

type SendResponse = (response: any) => void;

export const authHandler = {
  checkAuth: async (sendResponse: SendResponse): Promise<void> => {
    try {
      console.log('🔍 Checking auth status...');

      if (!AuthManager) {
        sendResponse({
          isAuthenticated: false,
          user: null,
          error: 'AuthManager not available'
        });
        return;
      }

      const authStatus: AuthStatus = await AuthManager.checkAuthStatus();
      console.log('✅ Auth status:', authStatus);
      sendResponse(authStatus);
    } catch (error) {
      console.error('❌ Auth check error:', error);
      sendResponse({
        isAuthenticated: false,
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  authenticate: async (sendResponse: SendResponse): Promise<void> => {
    try {
      console.log('🔐 Authentication requested...');

      if (!AuthManager) {
        sendResponse({
          success: false,
          error: 'AuthManager not available'
        });
        return;
      }

      const result: AuthResult = await AuthManager.authenticateWithGoogle();

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

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notificationService.notifyExtensionParts('AUTH_ERROR', { error: errorMessage });

      sendResponse({
        success: false,
        error: errorMessage,
        message: 'Authentication failed'
      });
    }
  },

  logout: async (sendResponse: SendResponse): Promise<void> => {
    try {
      console.log('👋 Logout requested...');

      if (!AuthManager) {
        sendResponse({
          success: false,
          error: 'AuthManager not available'
        });
        return;
      }

      await chrome.storage.sync.set({ chatSettings: { hasGreeting: false } });

      const success: boolean = await AuthManager.logout();

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
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Logout failed'
      });
    }
  },

  refreshToken: async (sendResponse: SendResponse): Promise<void> => {
    try {
      console.log('🔄 Token refresh requested...');

      if (!AuthManager) {
        sendResponse({ success: false, error: 'AuthManager not available' });
        return;
      }

      const success: boolean = await AuthManager.refreshToken();
      sendResponse({ success });
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  },

  getAuthToken: async (sendResponse: SendResponse): Promise<void> => {
    try {
      if (!AuthManager) {
        sendResponse({ token: null, error: 'AuthManager not available' });
        return;
      }

      const token: string | null = await AuthManager.getBearerToken();
      sendResponse({ token });
    } catch (error) {
      sendResponse({ 
        token: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};