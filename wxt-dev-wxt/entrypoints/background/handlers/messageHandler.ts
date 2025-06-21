// handlers/MessageHandler.ts
import { authHandler } from './authHandler';
import { chatHandler } from './chatHandler';
import { settingsHandler } from './settingsHandler';
import { extensionHandler } from './extensionHandler';

// Define specific message types for better type safety
type BackgroundMessageType =
  | 'CHECK_AUTH'
  | 'AUTHENTICATE'
  | 'LOGOUT'
  | 'REFRESH_TOKEN'
  | 'GET_AUTH_TOKEN'
  | 'CHAT_MESSAGE'
  | 'GET_USER_SETTINGS'
  | 'SAVE_USER_SETTINGS'
  | 'GET_CHAT_SETTINGS'
  | 'SAVE_CHAT_SETTINGS'
  | 'EXTENSION_TOGGLED'
  | 'TEST_CONNECTION';

export interface BackgroundMessage {
  type: BackgroundMessageType;
  data?: any;
}

interface BackgroundMessageResponse {
  success?: boolean;
  data?: any;
  error?: string;
  receivedType?: string;
}


interface Sender {
  tab?: chrome.tabs.Tab;
  frameId?: number;
  url?: string;
}

type SendResponse = (response?: any) => void;

export const messageHandler = {
  handle: (message: BaseMessage, sender: Sender, sendResponse: SendResponse): void => {
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

      // // Chat messages
      // case 'CHAT_MESSAGE':
      //   return chatHandler.handleMessage(message.data, sendResponse);

      // // Settings messages
      // case 'GET_USER_SETTINGS':
      //   return settingsHandler.getUserSettings(sendResponse);

      // case 'SAVE_USER_SETTINGS':
      //   return settingsHandler.saveUserSettings(message.data, sendResponse);

      // case 'GET_CHAT_SETTINGS':
      //   return settingsHandler.getChatSettings(sendResponse);

      // case 'SAVE_CHAT_SETTINGS':
      //   return settingsHandler.saveChatSettings(message.data, sendResponse);

      // // Extension messages
      // case 'EXTENSION_TOGGLED':
      //   return extensionHandler.handleToggle(message.data, sendResponse);

      // case 'TEST_CONNECTION':
      //   return extensionHandler.testConnection(sendResponse);

      // default:
      //   console.warn('❓ Unknown message type:', message.type);
      //   sendResponse({
      //     error: 'Unknown message type',
      //     receivedType: message.type
      //   });
    }
  }
};