// types/api.ts
export interface ApiError extends Error {
    status?: number | string;
    statusText?: string;
    requiresAuth?: boolean;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
    requiresAuth?: boolean;
}

export type ErrorType =
    | 'AUTH_REQUIRED'
    | 'UNAUTHORIZED'
    | 'RATE_LIMITED'
    | 'SERVER_ERROR'
    | 'NO_RESPONSE'
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR';

// Backend Request Models (matching Pydantic)
export interface GoogleVerifyTokenRequest {
    id_token: string;
}

export interface GoogleAccessTokenRequest {
    access_token: string;
}

export interface ChatRequest {
    message: string;
}

export interface ChatWithSearchRequest {
    message: string;
    temperature?: number; // 0.0 to 2.0, default 0.7
    max_tokens?: number | null;
}

export interface ImageData {
    data: string; // base64 encoded image data
    mime_type: string; // 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export interface ChatWithImageRequest {
    message: string;
    images: ImageData[]; // min 1, max 5 images
    use_search?: boolean;
    temperature?: number;
    max_tokens?: number | null;
}

export interface ChatAdvancedRequest {
    message: string;
    images?: ImageData[] | null;
    use_search?: boolean;
    temperature?: number;
    max_tokens?: number | null;
    stop_sequences?: string[] | null;
}

// Backend Response Models (matching Pydantic)
export interface GoogleUserInfo {
    id: string;
    email: string;
    name?: string | null;
    picture?: string | null; // HttpUrl as string
}

export interface GoogleVerifyTokenResponse {
    message: string;
    user: GoogleUserInfo;
    appSessionToken: string;
}

export interface ChatResponse {
    reply: string;
}

export interface TranscriptResponse {
    video_id: string;
    title: string;
    formatted_transcript: Record<string, string[]>;
}

export interface YouTubeProcessResponse {
    message: string;
    video_id?: string | null;
    title?: string | null;
    transcript?: TranscriptResponse | null;
    video_download_status: string;
}

// Frontend-specific types for convenience
export interface ChatOptions {
    temperature?: number;
    maxTokens?: number | null;
    useSearch?: boolean;
    stopSequences?: string[];
}

// Validation helpers
export const MAX_STOP_SEQUENCES = 10;
