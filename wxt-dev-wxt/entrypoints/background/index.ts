import { onMessage, sendMessage } from './types/messages';
import AuthManager from './managers/authManager';
import { withAuth } from './middleware/authMiddleware';
import { ChatManager } from './managers/chatManager';
import { isValidPage } from './utils/pageUtils';

const extensionStorage = storage.defineItem<boolean>('sync:extensionEnabled');

// Enhanced notification function with validation
const notifyValidContentScripts = async (enabled: boolean) => {
  const tabs = await chrome.tabs.query({});
  const validTabs = tabs.filter(tab => isValidPage(tab.url));

  for (const tab of validTabs) {
    try {
      await sendMessage('toggleExtension', { enabled }, tab.id);
      console.log(`✅ Sent to tab ${tab.id}: ${tab.url}`);
    } catch (error) {
      console.log(`⚠️ Failed tab ${tab.id}: ${tab.url?.substring(0, 50)}...`);
    }
  }

  console.log(`📊 Processed ${validTabs.length}/${tabs.length} valid tabs`);
};

export default defineBackground(() => {
  console.log('✅ Background script loaded successfully!');
  // Debug functions with validation
  const debugFunctions = {
    async testOnValidTabs() {
      console.log('🧪 Testing on valid tabs only...');
      const tabs = await chrome.tabs.query({});
      const validTabs = tabs.filter(tab => isValidPage(tab.url));

      console.log(`Found ${validTabs.length} valid tabs out of ${tabs.length} total`);

      for (const tab of validTabs) {
        try {
          await sendMessage('navigateTo', {
            url: "https://music.youtube.com/playlist?list=RDCLAK5uy_ljyDz8FJv4xec1TEdCPzYAHasU-OgXTeU"
          }, tab.id);
          await new Promise(resolve => setTimeout(resolve, 3000));
          await sendMessage('captureState', undefined, tab.id);
          console.log(`✅ ${tab.id}: ${tab.url?.substring(0, 50)}...`);
        } catch (error) {
          console.log(`❌ ${tab.id}: No content script`);
        }
      }
    },

    async listTabTypes() {
      const tabs = await chrome.tabs.query({});
      const validTabs = tabs.filter(t => isValidPage(t.url));
      const invalidTabs = tabs.filter(t => !isValidPage(t.url));

      console.log('📋 Tab categories:');
      console.log(`Valid: ${validTabs.length}`, validTabs.map(t => t.url));
      console.log(`Invalid: ${invalidTabs.length}`, invalidTabs.map(t => t.url));

      return { valid: validTabs, invalid: invalidTabs };
    }
  };
  // Expose to global scope for console access
  (globalThis as any).debug = debugFunctions;

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