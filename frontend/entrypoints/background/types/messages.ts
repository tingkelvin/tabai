// types/messages.ts
import { defineExtensionMessaging } from '@webext-core/messaging';

import { CheckAuthResponse, AuthenticateResponse, BaseResponse, GetAuthTokenResponse, askLlmResponse } from './responses'; // Adjust the import path as necessary

import { ApiResponse, ChatResponse } from './api';
import { ToggleExtensionRequest, navigateToRequest, chatRequest } from './requests';
import { AppState } from '@/entrypoints/content/types/AppState';
import { ChatMessage } from '@/entrypoints/content/types';
// Define your protocol map with all message types and their data/return types
export interface ProtocolMap {
  // Auth messages
  checkAuth: () => CheckAuthResponse;
  authenticate: () => AuthenticateResponse;
  logout: () => BaseResponse;
  getAuthToken: () => GetAuthTokenResponse;
  chat: (data: chatRequest) => ApiResponse<ChatResponse>;

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

  // App State messages
  loadAppState: () => AppState | null;
  saveAppState: (state: AppState) => void;
  updateAppState: (state: AppState) => void;
  onUpdateAppState: (state: AppState) => void;

  // ProtocolMap additions
  addChatMessage: (message: ChatMessage) => void;
  getChatMessages: () => ChatMessage[];
  clearChatMessages: () => void;
}

// Create the messaging functions
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();