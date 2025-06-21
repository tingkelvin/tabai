// handlers/AuthHandler.ts
import AuthManager from '../managers/authManager';
// import { notificationService } from '../services/NotificationService.js';
import { CheckAuthResponse, AuthenticateResponse, BaseResponse } from '../types/responses';

export const authHandler = {
  checkAuth: async (): Promise<CheckAuthResponse> => {
    if (!AuthManager) {
      return { success: false, isAuthenticated: false, error: 'Fail to authenicate 1' };
    }
    return await AuthManager.checkAuthStatus();
  },

  authenticate: async (): Promise<AuthenticateResponse> => {
    console.log('🔐 Authentication requested...');

    if (!AuthManager) {
      return {
        success: false,
        error: 'Unble to authenicate 1'
      };
    }

    return await AuthManager.authenticateWithGoogle();
  },

  logout: async (): Promise<BaseResponse> => {
    console.log('👋 Logout requested...');

    if (!AuthManager) {
      return {
        success: false,
        error: 'AuthManager not available'
      };
    }

    // Clear chat settings using WXT storage
    const chatSettings = storage.defineItem<any>('sync:chatSettings');
    await chatSettings.setValue({ hasGreeting: false });

    return await AuthManager.logout();
  },

  // refreshToken: async (sendResponse: SendResponse): Promise<void> => {
  //   try {
  //     console.log('🔄 Token refresh requested...');

  //     if (!AuthManager) {
  //       sendResponse({ success: false, error: 'AuthManager not available' });
  //       return;
  //     }

  //     const success: boolean = await AuthManager.refreshToken();
  //     sendResponse({ success });
  //   } catch (error) {
  //     console.error('❌ Token refresh error:', error);
  //     sendResponse({ 
  //       success: false, 
  //       error: error instanceof Error ? error.message : 'Unknown error' 
  //     });
  //   }
  // },

  // getAuthToken: async (sendResponse: SendResponse): Promise<void> => {
  //   try {
  //     if (!AuthManager) {
  //       sendResponse({ token: null, error: 'AuthManager not available' });
  //       return;
  //     }

  //     const token: string | null = await AuthManager.getBearerToken();
  //     sendResponse({ token });
  //   } catch (error) {
  //     sendResponse({ 
  //       token: null, 
  //       error: error instanceof Error ? error.message : 'Unknown error' 
  //     });
  //   }
  // }
};