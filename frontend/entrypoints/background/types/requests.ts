import { ChatOptions } from "./api";

export interface ToggleExtensionRequest {
  enabled: boolean;
}

export interface navigateToRequest {
  url: string;
}

export interface chatRequest {
  message: string
}