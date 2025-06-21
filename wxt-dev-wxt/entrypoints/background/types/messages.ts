// types/messages.ts
import { defineExtensionMessaging } from '@webext-core/messaging';

import { CheckAuthResponse, AuthenticateResponse, BaseResponse, GetAuthTokenResponse } from './responses'; // Adjust the import path as necessary
// Define your protocol map with all message types and their data/return types
export interface ProtocolMap {
  // Auth messages
  checkAuth: () => CheckAuthResponse;
  authenticate: () => AuthenticateResponse;
  logout: () => BaseResponse;
  getAuthToken: () => GetAuthTokenResponse;

  // // Chat messages
  // chatMessage: (data: { content: string; conversationId?: string }) => { response: string; error?: string };

  // // Settings messages
  // getUserSettings: () => { theme?: string; notifications?: boolean;[key: string]: any };
  // saveUserSettings: (settings: { [key: string]: any }) => { success: boolean; error?: string };
  // getChatSettings: () => { [key: string]: any };
  // saveChatSettings: (settings: { [key: string]: any }) => { success: boolean; error?: string };

  // // Extension messages
  // extensionToggled: (data: { enabled: boolean }) => { success: boolean };
  // testConnection: () => { success: boolean; status?: string; error?: string };
}

// Create the messaging functions
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();