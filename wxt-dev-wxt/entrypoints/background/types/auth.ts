export interface AuthStatus {
    isAuthenticated: boolean;
    user: any;
    error?: string;
}

export interface AuthResult {
    success: boolean;
    user: any;
    error?: string;
}

export interface GoogleUserInfo {
    id: string;
    email: string;
    name?: string;
    picture?: string;
}

export interface JWTPayload {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    exp?: number;
    [key: string]: any;
}
