// handlers/ExtensionLifecycleManager.js
import AuthManager from '../AuthManager.js';
import { notificationService } from '../services/NotificationService.js';

export const extensionLifecycleManager = {
  handleInstalled: async (details) => {
    // console.log('📦 Extension installed/updated:', details.reason);
    
    if (AuthManager) {
      const authStatus = await AuthManager.checkAuthStatus();
      // console.log('🔍 Initial auth status:', authStatus);
    }
  },

  handleStartup: async () => {
    // console.log('🔄 Extension starting up');
    
    if (AuthManager) {
      const authStatus = await AuthManager.checkAuthStatus();
      if (authStatus.isAuthenticated) {
        await AuthManager.refreshToken();
      }
    }
  },

  handleStorageChanges: (changes, namespace) => {
    if (namespace === 'local') {
      const authKeys = ['bearerToken', 'userInfo', 'tokenExpiry'];
      const hasAuthChanges = authKeys.some(key => changes[key]);
      
      if (hasAuthChanges) {
        // console.log('🔄 Auth state changed in storage');
        notificationService.notifyExtensionParts('AUTH_STATE_CHANGED');
        
        if (AuthManager) {
          AuthManager.notifyContentScripts('AUTH_STATE_CHANGED');
        }
      }
    }
  }
};