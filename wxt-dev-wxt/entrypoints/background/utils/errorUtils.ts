// utils/errorUtils.ts

// Define specific error types as string literals
export type ErrorType =
    | 'AUTH_REQUIRED'
    | 'UNAUTHORIZED'
    | 'RATE_LIMITED'
    | 'SERVER_ERROR'
    | 'NO_RESPONSE'
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR';

// Define specific HTTP status codes
type HttpStatus = 401 | 429 | 500;
type CustomStatus = 'NO_RESPONSE';
type ErrorStatus = HttpStatus | CustomStatus;

interface ErrorConfig {
    readonly content: string;
    readonly requiresAuth?: boolean;
}

interface ErrorResponse {
    readonly success: false;
    readonly error: ErrorType;
    readonly content: string;
    readonly timestamp: number;
    readonly requiresAuth?: boolean;
}

export interface ErrorWithStatus extends Error {
    readonly status?: ErrorStatus | number;
    readonly error?: ErrorType;
}

// Error type definitions with strict typing
const ERROR_TYPES: Readonly<Record<ErrorType, ErrorConfig>> = {
    AUTH_REQUIRED: {
        content: "Please log in to use the chat feature.",
        requiresAuth: true
    },
    UNAUTHORIZED: {
        content: "Your session has expired. Please log in again.",
        requiresAuth: true
    },
    RATE_LIMITED: {
        content: "You are sending too many requests, please wait a moment before trying again."
    },
    SERVER_ERROR: {
        content: "I cannot process this, please try again later."
    },
    NO_RESPONSE: {
        content: "I have no response for your question."
    },
    NETWORK_ERROR: {
        content: "Network connection error. Please check your internet connection."
    },
    UNKNOWN_ERROR: {
        content: "I'm sorry, I encountered an error processing your message."
    }
} as const;

// Type guard to check if a string is a valid ErrorType
function isValidErrorType(type: string): type is ErrorType {
    return type in ERROR_TYPES;
}

// Centralized error response creator with strict typing
export function createErrorResponse(error: ErrorWithStatus): ErrorResponse {
    let errorType: ErrorType = 'UNKNOWN_ERROR';

    // Map HTTP status to error type with type narrowing
    if (error.status === 401) {
        errorType = 'UNAUTHORIZED';
    } else if (error.status === 429) {
        errorType = 'RATE_LIMITED';
    } else if (error.status === 500) {
        errorType = 'SERVER_ERROR';
    } else if (error.status === 'NO_RESPONSE') {
        errorType = 'NO_RESPONSE';
    } else if (error.name === 'TypeError' || error.message?.includes('fetch')) {
        errorType = 'NETWORK_ERROR';
    }

    const errorConfig = ERROR_TYPES[errorType];

    const response: ErrorResponse = {
        success: false,
        error: errorType,
        content: errorConfig.content,
        timestamp: Date.now(),
    };

    // Add requiresAuth if present
    if (errorConfig.requiresAuth) {
        return { ...response, requiresAuth: true };
    }

    return response;
}

// Helper to check if error requires authentication with strict typing
export function requiresAuthentication(error: ErrorWithStatus | ErrorResponse): boolean {
    // Type guard to check if error has status property
    if ('status' in error && error.status === 401) {
        return true;
    }

    // Type guard to check if error has error property
    if ('error' in error && error.error) {
        return error.error === 'UNAUTHORIZED' || error.error === 'AUTH_REQUIRED';
    }

    return false;
}

// Helper to get user-friendly error message with strict typing
export function getErrorMessage(error: ErrorWithStatus | ErrorResponse): string {
    // Type guard and strict error type checking
    if ('error' in error && error.error && isValidErrorType(error.error)) {
        return ERROR_TYPES[error.error].content;
    }

    // Check if it's ErrorWithStatus (has message property)
    if ('message' in error) {
        return error.message || 'An unknown error occurred';
    }

    return 'An unknown error occurred';
}