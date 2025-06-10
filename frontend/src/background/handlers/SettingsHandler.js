// handlers/SettingsHandler.js
import AuthManager from '../AuthManager.js';
import { notificationService } from '../services/NotificationService.js';

const defaultUserSettings = {
  darkMode: false,
  notifications: true,
  dataCollection: false
};

export const settingsHandler = {
  getUserSettings: async (sendResponse) => {
    try {
      const authStatus = AuthManager ? 
        await AuthManager.checkAuthStatus() : 
        { isAuthenticated: false, user: null };
      
      chrome.storage.sync.get(['userSettings'], (result) => {
        const settings = result.userSettings || defaultUserSettings;
        sendResponse({
          success: true,
          settings,
          user: authStatus.user,
          isAuthenticated: authStatus.isAuthenticated
        });
      });
    } catch (error) {
      console.error('❌ Error getting user settings:', error);
      sendResponse({
        success: true,
        settings: defaultUserSettings,
        user: null,
        isAuthenticated: false
      });
    }
  },

  saveUserSettings: async (data, sendResponse) => {
    try {
      const { settings } = data;
      await chrome.storage.sync.set({ userSettings: settings });
      
      // Notify all parts of the extension about the settings change
      await notificationService.notifyExtensionParts('SETTINGS_UPDATED', { settings });
      await notificationService.notifyContentScripts('SETTINGS_UPDATED', { settings });
      
      sendResponse({
        success: true,
        message: 'User settings saved successfully'
      });
    } catch (error) {
      console.error('❌ Error saving user settings:', error);
      sendResponse({
        success: false,
        error: error.message,
        message: 'Failed to save user settings'
      });
    }
  },

  getChatSettings: async (sendResponse) => {
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
      console.error('❌ Error getting chat settings:', error);
      sendResponse({
        success: true,
        settings: {},
        user: null,
        isAuthenticated: false
      });
    }
  },

  saveChatSettings: async (data, sendResponse) => {
    try {
      await chrome.storage.sync.set({ chatSettings: data.settings });
      
      // Notify about chat settings change
      await notificationService.notifyExtensionParts('CHAT_SETTINGS_UPDATED', { settings: data.settings });
      await notificationService.notifyContentScripts('CHAT_SETTINGS_UPDATED', { settings: data.settings });
      
      sendResponse({
        success: true,
        message: 'Chat settings saved successfully'
      });
    } catch (error) {
      console.error('❌ Error saving chat settings:', error);
      sendResponse({
        success: false,
        error: error.message,
        message: 'Failed to save chat settings'
      });
    }
  }
};