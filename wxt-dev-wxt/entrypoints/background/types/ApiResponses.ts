// types/auth.ts
export interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture: string;
}

export interface JWTPayload {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    exp?: number;
    [key: string]: any;
}

// types/responses.ts
export interface BaseResponse {
    success: boolean;
    error?: string;
}

export interface CheckAuthResponse extends BaseResponse {
    isAuthenticated: boolean;
    user: GoogleUserInfo | null;
}

export interface AuthenticateResponse extends BaseResponse {
    user: GoogleUserInfo | null;
}

export interface GetAuthTokenResponse extends BaseResponse {
    bearerToken: string;
}

export interface GoogleVerifyTokenResponse {
    appSessionToken: string;
    user: GoogleUserInfo;
}
