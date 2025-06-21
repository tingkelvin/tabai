import { onMessage, sendMessage } from './types/messages';
import AuthManager from './managers/authManager';
import { withAuth } from './middleware/authMiddleware';
import { ChatManager } from './managers/chatManager';

const extensionStorage = storage.defineItem<boolean>('sync:extensionEnabled');

const notifyContentScripts = async (enabled: boolean) => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await sendMessage('toggleExtension', { enabled }, tab.id);
    } catch (error) {
      console.log('Could not send message to content script:', error);
    }
  }
};

export default defineBackground(() => {
  console.log('✅ Background script loaded successfully!');
  onMessage('checkAuth', async () => {
    return await AuthManager.checkAuthStatus();
  });

  onMessage('authenticate', async () => {
    return await AuthManager.authenticateWithGoogle();
  });

  onMessage('logout', async () => {
    return await AuthManager.logout();
  });

  onMessage('toggleExtension', async ({ data: { enabled } }) => {

    console.log("🔄 Toggling extension:", enabled);
    await extensionStorage.setValue(enabled);
    await notifyContentScripts(enabled);
  });


  onMessage('askLlm', async ({ data: { content } }) => {
    return withAuth(async () => { return await ChatManager.sendMessage(content); });
  });
})