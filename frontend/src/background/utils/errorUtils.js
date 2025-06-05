// utils/errorUtils.js

// Error type definitions
const ERROR_TYPES = {
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
  };
  
  // Centralized error response creator
  export function createErrorResponse(error) {
    let errorType = 'UNKNOWN_ERROR';
    
    // Map HTTP status to error type
    if (error.status === 401) {
      errorType = 'UNAUTHORIZED';
    } else if (error.status === 429) {
      errorType = 'RATE_LIMITED';
    } else if (error.status === 500) {
      errorType = 'SERVER_ERROR';
    } else if (error.status === 'NO_RESPONSE') {
      errorType = 'NO_RESPONSE';
    } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
      errorType = 'NETWORK_ERROR';
    }
    
    const errorConfig = ERROR_TYPES[errorType];
    
    return {
      success: false,
      error: errorType,
      content: errorConfig.content,
      timestamp: Date.now(),
      ...(errorConfig.requiresAuth && { requiresAuth: true })
    };
  }
  
  // Helper to check if error requires authentication
  export function requiresAuthentication(error) {
    return error.status === 401 || error.error === 'UNAUTHORIZED' || error.error === 'AUTH_REQUIRED';
  }
  
  // Helper to get user-friendly error message
  export function getErrorMessage(error) {
    const errorType = error.error || 'UNKNOWN_ERROR';
    return ERROR_TYPES[errorType]?.content || error.message || 'An unknown error occurred';
  }