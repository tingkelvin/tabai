import { onMessage } from './types/messages';
import AuthManager from './managers/authManager';

export default defineBackground(() => {
  console.log('✅ Background script loaded successfully!');
  onMessage('checkAuth', async () => {
    return await AuthManager.checkAuthStatus();
  });

  onMessage('authenticate', async ({ data }) => {
    return await AuthManager.authenticateWithGoogle();
  });

  onMessage('logout', async () => {
    return await AuthManager.logout();
  });

  onMessage('getAuthToken', async () => {
    return await AuthManager.getAuthToken();
  });
})