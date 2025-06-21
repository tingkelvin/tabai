import { ApiResponse, ChatResponse, ErrorType } from "../types/api";

// utils/errorHandler.ts
const ERROR_MESSAGES: Record<ErrorType, { reply: string; requiresAuth?: boolean }> = {
    AUTH_REQUIRED: {
        reply: "Please log in to use the chat feature.",
        requiresAuth: true
    },
    UNAUTHORIZED: {
        reply: "Your session has expired. Please log in again.",
        requiresAuth: true
    },
    RATE_LIMITED: {
        reply: "Too many requests. Please wait before trying again."
    },
    SERVER_ERROR: {
        reply: "Server error. Please try again later."
    },
    NO_RESPONSE: {
        reply: "No response received."
    },
    NETWORK_ERROR: {
        reply: "Network error. Check your connection."
    },
    UNKNOWN_ERROR: {
        reply: "An unexpected error occurred."
    }
};

export const ErrorHandler = {
    getErrorType(error: any): ErrorType {
        if (error?.status === 401) return 'UNAUTHORIZED';
        if (error?.status === 429) return 'RATE_LIMITED';
        if (error?.status === 500) return 'SERVER_ERROR';
        if (error?.status === 'NO_RESPONSE') return 'NO_RESPONSE';
        if (error?.name === 'TypeError' || error?.message?.includes('fetch')) return 'NETWORK_ERROR';
        return 'UNKNOWN_ERROR';
    },

    createChatResponse(error: any, context?: string): ApiResponse<ChatResponse> {
        const errorType = this.getErrorType(error);
        const errorConfig = ERROR_MESSAGES[errorType];
        // Log with context for debugging
        console.error(`❌ Error in ${context}:`, error);
        console.error(`📋 Error type: ${errorType}`);
        return {
            success: false,
            data: {
                reply: errorConfig.reply
            },
            timestamp: Date.now(),
            requiresAuth: errorConfig.requiresAuth
        };
    },

    createResponse<T>(error: any, context?: string): ApiResponse<T> {
        const errorType = this.getErrorType(error);
        const errorConfig = ERROR_MESSAGES[errorType];
        console.error(`❌ Error in ${context}:`, error);
        console.error(`📋 Error type: ${errorType}`);
        return {
            success: false,
            error: errorConfig.reply,
            timestamp: Date.now(),
            requiresAuth: errorConfig.requiresAuth
        };
    },


    requiresAuth(error: any): boolean {
        return error?.status === 401 || error?.requiresAuth === true;
    }
};
