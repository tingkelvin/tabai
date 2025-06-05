// Centralized error response creator
export const createErrorResponse = (error) => {
    const baseResponse = {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  
    // Handle different error types
    switch (error.status) {
      case 401:
        return {
          ...baseResponse,
          error: 'UNAUTHORIZED',
          content: "Your session has expired. Please log in again.",
          requiresAuth: true
        };
        
      case 429:
        return {
          ...baseResponse,
          error: 'RATE_LIMITED',
          content: "You are sending too many requests, please wait a moment before trying again."
        };
        
      case 500:
        return {
          ...baseResponse,
          error: 'SERVER_ERROR',
          content: "I cannot process this, please try again later."
        };
        
      case 'NO_RESPONSE':
        return {
          ...baseResponse,
          error: 'NO_RESPONSE',
          content: "I have no response for your question."
        };
        
      default:
        return {
          ...baseResponse,
          error: 'UNKNOWN_ERROR',
          content: "I'm sorry, I encountered an error processing your message."
        };
    }
  }