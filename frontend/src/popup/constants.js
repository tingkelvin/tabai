// constants.js - Shared constants for the extension

export const STORAGE_KEYS = {
  BEARER_TOKEN: 'bearerToken',
  USER_INFO: 'userInfo',
  TOKEN_EXPIRY: 'tokenExpiry',
  EXTENSION_ENABLED: 'extensionEnabled'
};

export const API_ENDPOINTS = {
  VERIFY: 'https://your-backend.com/auth/verify',
  LOGOUT: 'https://your-backend.com/auth/logout',
  REFRESH: 'https://your-backend.com/auth/refresh'
};

export const MESSAGE_TYPES = {
  // Auth related
  USER_AUTHENTICATED: 'USER_AUTHENTICATED',
  USER_LOGGED_OUT: 'USER_LOGGED_OUT',
  AUTH_STATE_CHANGED: 'AUTH_STATE_CHANGED',
  GET_AUTH_TOKEN: 'GET_AUTH_TOKEN',
  GET_AUTH_STATUS: 'GET_AUTH_STATUS',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  
  // Extension related
  TOGGLE_EXTENSION: 'TOGGLE_EXTENSION'
};

export const AUTH_SCOPES = [
  'openid',
  'email',
  'profile'
];

export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds