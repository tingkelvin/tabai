// handlers/SettingsHandler.js
import AuthManager from '../AuthManager.js';

export const settingsHandler = {
  getSettings: async (sendResponse) => {
    try {
      const authStatus = AuthManager ? 
        await AuthManager.checkAuthStatus() : 
        { isAuthenticated: false, user: null };
      
      chrome.storage.sync.get(['chatSettings'], (result) => {
        sendResponse({
          success: true,
          settings: result.chatSettings || {},
          user: authStatus.user,
          isAuthenticated: authStatus.isAuthenticated
        });
      });
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      chrome.storage.sync.get(['chatSettings'], (result) => {
        sendResponse({
          success: true,
          settings: result.chatSettings || {},
          user: null,
          isAuthenticated: false
        });
      });
    }
  },

  saveSettings: async (data, sendResponse) => {
    try {
      chrome.storage.sync.set({ chatSettings: data.settings }, () => {
        sendResponse({
          success: true,
          message: 'Settings saved successfully'
        });
      });
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      sendResponse({
        success: false,
        error: error.message,
        message: 'Failed to save settings'
      });
    }
  }
};