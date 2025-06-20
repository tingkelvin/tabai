// handlers/ChatHandler.ts
import AuthManager from '../managers/authManager';
import { chatWithLlm } from '../services/apiServices';
import { createErrorResponse, ErrorWithStatus, ErrorType } from '../utils/errorUtils';

interface ChatData {
  message: string;
}

interface ChatResponse {
  success: boolean;
  content?: string;
  error?: ErrorType;
  timestamp?: number;
  isMockResponse?: boolean;
  requiresAuth?: boolean;
}

type SendResponse = (response: ChatResponse) => void;

const createAuthError = (message: string) => {
  const error = new Error(message) as ErrorWithStatus;
  error.status = 401;
  return error;
};

export const chatHandler = {
  handleMessage: async (data: ChatData, sendResponse: SendResponse): Promise<void> => {
    try {
      console.log('💬 Processing chat message:', data.message);

      if (!AuthManager) {
        return sendResponse(createErrorResponse(new Error('AuthManager not available')));
      }

      const authStatus = await AuthManager.checkAuthStatus();
      if (!authStatus.isAuthenticated) {
        await AuthManager.logout();
        return sendResponse(createErrorResponse(createAuthError('Authentication required')));
      }

      const bearerToken = await AuthManager.getBearerToken();
      if (!bearerToken) {
        await AuthManager.logout();
        return sendResponse(createErrorResponse(createAuthError('Token unavailable')));
      }

      const apiResponse = await chatWithLlm(data.message, bearerToken);

      sendResponse({
        success: true,
        content: apiResponse.reply,
        timestamp: Date.now(),
        isMockResponse: false
      });

    } catch (error) {
      console.error('❌ Error processing chat message:', error);

      const typedError = error instanceof Error ? error as ErrorWithStatus : new Error('Unknown error');

      if (typedError.message?.includes('401')) {
        typedError.status = 401;
      }

      const errorResponse = createErrorResponse(typedError);

      if (['UNAUTHORIZED', 'AUTH_REQUIRED'].includes(errorResponse.error) && AuthManager) {
        await AuthManager.logout();
      }

      sendResponse(errorResponse);
    }
  }
};