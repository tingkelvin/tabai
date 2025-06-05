// handlers/MessageHandler.js
import { authHandler } from './AuthHandler.js';
import { chatHandler } from './ChatHandler.js';
import { settingsHandler } from './SettingsHandler.js';
import { extensionHandler } from './ExtensionHandler.js';

export const messageHandler = {
  handle: (message, sender, sendResponse) => {
    switch (message.type) {
      // Auth messages
      case 'CHECK_AUTH':
        return authHandler.checkAuth(sendResponse);
      
      case 'AUTHENTICATE':
        return authHandler.authenticate(sendResponse);

      case 'LOGOUT':
        return authHandler.logout(sendResponse);

      case 'REFRESH_TOKEN':
        return authHandler.refreshToken(sendResponse);

      case 'GET_AUTH_TOKEN':
        return authHandler.getAuthToken(sendResponse);

      // Chat messages
      case 'CHAT_MESSAGE':
        return chatHandler.handleMessage(message.data, sendResponse);

      // Settings messages
      case 'GET_SETTINGS':
        return settingsHandler.getSettings(sendResponse);
      
      case 'SAVE_SETTINGS':
        return settingsHandler.saveSettings(message.data, sendResponse);

      // Extension messages
      case 'EXTENSION_TOGGLED':
        return extensionHandler.handleToggle(message.data, sendResponse);

      case 'TEST_CONNECTION':
        return extensionHandler.testConnection(sendResponse);
      
      default:
        console.warn('❓ Unknown message type:', message.type);
        sendResponse({ 
          error: 'Unknown message type',
          receivedType: message.type 
        });
    }
  }
};