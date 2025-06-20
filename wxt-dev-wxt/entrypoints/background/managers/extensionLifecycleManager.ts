// handlers/ExtensionLifecycleManager.ts
import AuthManager from './authManager';
import { notificationService } from '../services/notificationService';

interface InstallDetails {
  reason: string;
}

interface StorageChange {
  newValue?: any;
  oldValue?: any;
}

interface StorageChanges {
  [key: string]: StorageChange;
}

export const extensionLifecycleManager = {
  handleInstalled: async (details: InstallDetails): Promise<void> => {
    console.log('📦 Extension installed/updated:', details.reason);

    if (AuthManager) {
      const authStatus = await AuthManager.checkAuthStatus();
      console.log('🔍 Initial auth status:', authStatus);
    }
  },

  handleStartup: async (): Promise<void> => {
    console.log('🔄 Extension starting up');

    if (AuthManager) {
      const authStatus = await AuthManager.checkAuthStatus();
      if (authStatus.isAuthenticated) {
        await AuthManager.refreshToken();
      }
    }
  },

  handleStorageChanges: (changes: StorageChanges, namespace: string): void => {
    if (namespace === 'sync') {
      // Handle user settings changes
      if (changes.userSettings) {
        const settings = changes.userSettings.newValue;
        console.log('🔄 User settings changed:', settings);

        // Notify all parts of the extension about settings changes
        notificationService.notifyExtensionParts('SETTINGS_UPDATED', { settings });
        notificationService.notifyContentScripts('SETTINGS_UPDATED', { settings });
      }

      // Handle chat settings changes
      if (changes.chatSettings) {
        const settings = changes.chatSettings.newValue;
        console.log('🔄 Chat settings changed:', settings);
        notificationService.notifyExtensionParts('CHAT_SETTINGS_UPDATED', { settings });
        notificationService.notifyContentScripts('CHAT_SETTINGS_UPDATED', { settings });
      }
    }

    if (namespace === 'local') {
      const authKeys = ['bearerToken', 'userInfo', 'tokenExpiry'];
      const hasAuthChanges = authKeys.some(key => changes[key]);

      if (hasAuthChanges) {
        console.log('🔄 Auth state changed in storage');
        notificationService.notifyExtensionParts('AUTH_STATE_CHANGED');

        if (AuthManager) {
          AuthManager.notifyContentScripts('AUTH_STATE_CHANGED');
        }
      }
    }
  }
};