// types/messages.ts
import { defineExtensionMessaging } from '@webext-core/messaging';

import { CheckAuthResponse, AuthenticateResponse, BaseResponse, GetAuthTokenResponse, askLlmResponse } from './responses'; // Adjust the import path as necessary


import { ApiResponse, ChatResponse } from './api';
import { ToggleExtensionRequest, navigateToRequest } from './requests';
// Define your protocol map with all message types and their data/return types
export interface ProtocolMap {
  // Auth messages
  checkAuth: () => CheckAuthResponse;
  authenticate: () => AuthenticateResponse;
  logout: () => BaseResponse;
  getAuthToken: () => GetAuthTokenResponse;
  askLlm: (data: { content: string }) => ApiResponse<ChatResponse>;

  // // Chat messages
  // chatMessage: (data: { content: string; conversationId?: string }) => { response: string; error?: string };

  // // Settings messages
  // getUserSettings: () => { theme?: string; notifications?: boolean;[key: string]: any };
  // saveUserSettings: (settings: { [key: string]: any }) => { success: boolean; error?: string };
  // getChatSettings: () => { [key: string]: any };
  // saveChatSettings: (settings: { [key: string]: any }) => { success: boolean; error?: string };

  // // Extension messages
  toggleExtension: (data: ToggleExtensionRequest) => void;
  // testConnection: () => { success: boolean; status?: string; error?: string };

  // automation
  navigateTo: (data: navigateToRequest) => void;
  captureState: () => void;
  waitForPageLoad: () => Promise<void>;

}

// Create the messaging functions
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();