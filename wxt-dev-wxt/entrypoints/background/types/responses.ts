import { GoogleUserInfo } from "./auth";

// Base response interface
export interface BaseResponse {
    success: boolean;
    error?: string;
}

// Auth-specific responses
export interface CheckAuthResponse extends BaseResponse {
    isAuthenticated: boolean;
    user?: GoogleUserInfo | null;
}

export interface AuthenticateResponse extends BaseResponse {
    user?: GoogleUserInfo | null;
}

export interface GetAuthTokenResponse extends BaseResponse {
    bearerToken?: string;
}

// interface ApiResponse<T = any> extends BaseResponse {
//     data?: T;
//     statusCode?: number;
// }

// interface BackendAuthResponse extends BaseResponse {
//     user?: GoogleUserInfo;
//     token?: string;
//     expiresAt?: number;
// }


