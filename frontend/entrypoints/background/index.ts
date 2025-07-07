import { onMessage, sendMessage } from './types/messages';
import AuthManager from './managers/authManager';
import { withAuth } from './middleware/authMiddleware';
import { ChatManager } from './managers/chatManager';
import { isValidPage } from './utils/pageUtils';
import { AppState } from '../content/types/AppState';
import { ChatMessage } from '../content/types';
import { WIDGET_CONFIG } from '../content/utils/constant';
import { calculateInitialPositions } from '../content/utils/helper';

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

// Default state factory
const createDefaultState = (): AppState => ({
  // Chat state
  chatMessages: [],
  isThinking: false,

  // Mode states
  useSearch: false,
  useAgent: false,

  // File state
  uploadedFiles: [],
  fileContentAsString: '',

  // Page state
  pageState: null,

  // Agent state
  currentTask: '',

  // UI state
  isMinimized: false,
  widgetSize: {
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  },
  iconPosition: {
    top: 50, // Default safe position
    left: 50
  },

  // Timestamps for state management
  lastUpdated: Date.now(),
  sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
});

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
    await notifyValidContentScripts(enabled);
  });

  let appStateStorage: AppState = createDefaultState();
  onMessage('loadAppState', () => {
    console.log('Loading app state from background:', appStateStorage);
    return appStateStorage;
  });

  onMessage('chat', async ({ data: { message, options } }) => {
    appStateStorage.isThinking = true
    const tabs = await chrome.tabs.query({});
    if (appStateStorage) {
      for (const tab of tabs) {
        try {
          await sendMessage('updateAppState', appStateStorage, tab.id);
          console.log(`✅ Sent to tab ${tab.id}: ${tab.url}`);
        } catch (error) {
          console.log(`⚠️ Failed tab ${tab.id}: ${tab.url?.substring(0, 50)}...`);
        }
      }
    }
    const result = await withAuth(async () => { return await ChatManager.sendMessage(message, options); });
    appStateStorage.isThinking = false
    if (appStateStorage) {
      for (const tab of tabs) {
        try {
          await sendMessage('updateAppState', appStateStorage, tab.id);
          console.log(`✅ Sent to tab ${tab.id}: ${tab.url}`);
        } catch (error) {
          console.log(`⚠️ Failed tab ${tab.id}: ${tab.url?.substring(0, 50)}...`);
        }
      }
    }
    return result
  });

  // Save app state
  onMessage('saveAppState', async (message) => {
    console.log('Saving app state to background:', message.data);
    appStateStorage = message.data;
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      try {
        await sendMessage('updateAppState', message.data, tab.id);
        console.log(`✅ Sent to tab ${tab.id}: ${tab.url}`);
      } catch (error) {
        console.log(`⚠️ Failed tab ${tab.id}: ${tab.url?.substring(0, 50)}...`);
      }
    }
  });

  onMessage('onUpdateAppState', async ({ data: updates }) => {
    if (!appStateStorage) {
      console.warn('No existing state to update');
      return;
    }

    appStateStorage = {
      ...appStateStorage,
      ...updates,
      lastUpdated: Date.now(),
    };
  });

  // Optional: Load from chrome.storage on startup
  // chrome.storage.local.get(['appState']).then((result) => {
  //   if (result.appState) {
  //     appStateStorage = result.appState;
  //   }
  // });

  // In background script

  onMessage('addChatMessage', async (message) => {
    appStateStorage?.chatMessages.push(message.data);
    const tabs = await chrome.tabs.query({});
    if (appStateStorage) {
      for (const tab of tabs) {
        try {
          await sendMessage('updateAppState', appStateStorage, tab.id);
          console.log(`✅ Sent to tab ${tab.id}: ${tab.url}`);
        } catch (error) {
          console.log(`⚠️ Failed tab ${tab.id}: ${tab.url?.substring(0, 50)}...`);
        }
      }
    }

  });

  onMessage('getChatMessages', () => {
    return appStateStorage?.chatMessages;
  });

  onMessage('clearChatMessages', () => {
    if (appStateStorage?.chatMessages) appStateStorage.chatMessages = [];
  });

})