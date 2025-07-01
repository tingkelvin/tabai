import { ApiResponse, ChatOptions, ChatRequest, ChatResponse, ChatWithSearchRequest, GoogleAccessTokenRequest, GoogleVerifyTokenResponse, MAX_STOP_SEQUENCES } from "../types/api";
import { ErrorHandler } from "../utils/errorUtils";

// services/apiClient.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const createHeaders = (appToken: string, includeContentType: boolean = true): Record<string, string> => {
  const headers: Record<string, string> = {
    accept: "application/json",
    Authorization: `Bearer ${appToken}`,
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const handleResponse = async <T>(response: Response, context: string): Promise<ApiResponse<T>> => {
  console.log(`📡 ${context} response status:`, response.status);

  if (!response.ok) {
    let errorDetail = "Unknown error";
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || errorDetail;
    } catch (e) {
      errorDetail = response.statusText;
    }

    return ErrorHandler.createResponse<T>({
      status: response.status,
      statusText: response.statusText,
      message: errorDetail
    }, context);
  }

  try {
    const data = await response.json();
    console.log(`📦 ${context} response data:`, data);

    return {
      success: true,
      data,
      timestamp: Date.now()
    };
  } catch (e) {
    return ErrorHandler.createResponse<T>({ status: 'NO_RESPONSE' }, context);
  }
};

const validateChatOptions = (options: ChatOptions = {}): string | null => {
  if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
    return "Temperature must be between 0.0 and 2.0";
  }

  if (options.maxTokens !== undefined && options.maxTokens !== null && options.maxTokens <= 0) {
    return "max_tokens must be greater than 0";
  }

  if (options.stopSequences && options.stopSequences.length > MAX_STOP_SEQUENCES) {
    return `Maximum ${MAX_STOP_SEQUENCES} stop sequences allowed`;
  }

  return null;
};



export const ApiClient = {
  async verifyGoogleAccessToken(token: string): Promise<ApiResponse<GoogleVerifyTokenResponse>> {
    try {
      const payload: GoogleAccessTokenRequest = { access_token: token };
      console.log(token)

      console.log(`${API_BASE_URL}/auth/google/verify-access-token`)

      const response = await fetch(`${API_BASE_URL}/auth/google/verify-access-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return handleResponse<GoogleVerifyTokenResponse>(response, "Google access token verification");
    } catch (error) {
      return ErrorHandler.createResponse<GoogleVerifyTokenResponse>(error, "Google access token verification");
    }
  },

  // Basic Chat
  async basicChat(message: string, appToken: string): Promise<ApiResponse<ChatResponse>> {
    try {
      if (!message.trim()) {
        return ErrorHandler.createChatResponse({ message: "Message cannot be empty" }, "Basic chat");
      }

      const payload: ChatRequest = { message: message.trim() };

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: createHeaders(appToken),
        body: JSON.stringify(payload),
      });

      return handleResponse<ChatResponse>(response, "Basic chat");
    } catch (error) {
      return ErrorHandler.createChatResponse(error, "Basic chat");
    }
  },

  // Chat with Search
  async chatWithSearch(
    message: string,
    appToken: string,
    options: ChatOptions = {}
  ): Promise<ApiResponse<ChatResponse>> {
    try {
      if (!message.trim()) {
        return ErrorHandler.createChatResponse({ message: "Message cannot be empty" }, "Chat with search");
      }

      const validationError = validateChatOptions(options);
      if (validationError) {
        return ErrorHandler.createChatResponse({ message: validationError }, "Chat with search");
      }

      const payload: ChatWithSearchRequest = {
        message: message.trim(),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? null,
      };

      const response = await fetch(`${API_BASE_URL}/chat/search`, {
        method: "POST",
        headers: createHeaders(appToken),
        body: JSON.stringify(payload),
      });

      return handleResponse<ChatResponse>(response, "Chat with search");
    } catch (error) {
      return ErrorHandler.createChatResponse(error, "Chat with search");
    }
  }
};
