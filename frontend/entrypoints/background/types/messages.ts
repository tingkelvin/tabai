// types/messages.ts
import { defineExtensionMessaging } from '@webext-core/messaging';

import { CheckAuthResponse, AuthenticateResponse, BaseResponse, GetAuthTokenResponse, askLlmResponse } from './responses';
import { ApiResponse, ChatResponse } from './api';
import { ToggleExtensionRequest, navigateToRequest, chatRequest } from './requests';
import { ContentAppState } from './state';

export interface ProtocolMap {
  // Auth messages
  checkAuth: () => CheckAuthResponse;
  authenticate: () => AuthenticateResponse;
  logout: () => BaseResponse;
  getAuthToken: () => GetAuthTokenResponse;
  chat: (data: chatRequest) => ApiResponse<ChatResponse>;

  // Extension messages
  toggleExtension: (data: ToggleExtensionRequest) => void;

  // Automation
  navigateTo: (data: navigateToRequest) => void;
  captureState: () => void;
  waitForPageLoad: () => Promise<void>;

  // State management
  getContentState: () => { state: ContentAppState | null };
  updateContentState: (data: { updates: Partial<ContentAppState> }) => { success: boolean };
  resetContentState: () => { success: boolean };
  stateUpdate: (data: { updates: Partial<ContentAppState> }) => void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();