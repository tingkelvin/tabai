import { GoogleUserInfo } from "./auth";

export interface GoogleVerifyTokenResponse {
    message: string;
    user: GoogleUserInfo;
    appSessionToken: string;
}