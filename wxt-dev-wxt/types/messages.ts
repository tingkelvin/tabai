export type BackgroundMessageType =
  | 'CHECK_AUTH'
  | 'AUTHENTICATE'
  | 'LOGOUT'
  | 'REFRESH_TOKEN'
  | 'GET_AUTH_TOKEN'
  | 'CHAT_MESSAGE'
  | 'GET_USER_SETTINGS'
  | 'SAVE_USER_SETTINGS'
  | 'GET_CHAT_SETTINGS'
  | 'SAVE_CHAT_SETTINGS'
  | 'EXTENSION_TOGGLED'
  | 'TEST_CONNECTION';

export interface BackgroundMessage {
  type: BackgroundMessageType;
  data?: any;
}