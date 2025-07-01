import { ApiClient } from "../services/apiClient";
import { ApiResponse, ChatOptions, ChatResponse } from "../types/api";
import { ErrorHandler } from "../utils/errorUtils";
import AuthManager from "./authManager";

export const ChatManager = {
    async sendMessage(message: string, options?: ChatOptions): Promise<ApiResponse<ChatResponse>> {
        try {
            console.log('💬 Processing chat message:', message);

            const tokenResponse = await AuthManager.getAuthToken();
            if (!tokenResponse.success || !tokenResponse.bearerToken) {
                return ErrorHandler.createChatResponse(
                    { status: 401, message: 'Authentication required' },
                    'Chat message processing'
                );
            }

            // Choose the appropriate chat method based on options
            let response;
            if (options?.useSearch) {
                response = await ApiClient.chatWithSearch(message, tokenResponse.bearerToken, options);
            } else {
                response = await ApiClient.basicChat(message, tokenResponse.bearerToken);
            }

            return {
                success: response.success,
                data: {
                    reply: response.data?.reply || ""
                },
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Chat error:', error);
            return ErrorHandler.createChatResponse(error, 'Chat message processing');
        }
    }
};