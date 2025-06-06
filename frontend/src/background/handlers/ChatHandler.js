// handlers/ChatHandler.js
import AuthManager from '../AuthManager.js';
import { chatWithLlm } from '../services/apiServices.js';
import { createErrorResponse } from '../utils/errorUtils.js';

export const chatHandler = {
  handleMessage: async (data, sendResponse) => {
    try {
      //console.log('💬 Processing chat message:', data.message);
      
      // Check if AuthManager is available
      if (!AuthManager) {
        return sendResponse({
          success: false,
          error: 'AUTH_SYSTEM_UNAVAILABLE',
          content: "Authentication system is not available. Please refresh the extension.",
        });
      }
      
      // Check authentication status
      const authStatus = await AuthManager.checkAuthStatus();
      
      if (!authStatus.isAuthenticated) {
        return sendResponse({
          success: false,
          error: 'AUTH_REQUIRED',
          content: "Please log in to use the chat feature.",
          requiresAuth: true
        });
      }

      // Get bearer token
      const bearerToken = await AuthManager.getBearerToken();
      
      if (!bearerToken) {
        return sendResponse({
          success: false,
          error: 'TOKEN_UNAVAILABLE',
          content: "Your session has expired. Please log in again.",
          requiresAuth: true
        });
      }

      // Call API
      const apiResponse = await chatWithLlm(
        data.message, 
        bearerToken
      );

      sendResponse({
        success: true,
        content: apiResponse.reply,
        timestamp: Date.now(),
        isMockResponse: false
      });

    } catch (error) {
      console.error('❌ Error processing chat message:', error);
      
      // Use centralized error handling
      const errorResponse = createErrorResponse(error);
      sendResponse(errorResponse);
    }
  }
};