import { onMessage, sendMessage } from './types/messages';
import AuthManager from './managers/authManager';
import { withAuth } from './middleware/authMiddleware';
import { ChatManager } from './managers/chatManager';
import { isValidPage } from './utils/pageUtils';

import stateManager from './managers/stateManager';
import { PromptBuilder } from './utils/prompMessages';
import { MESSAGE_TYPES } from '../content/utils/constant';
import { ApiResponse, ChatResponse } from './types/api';

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
    },
    async page() {
      console.log('🧪 Testing on get page state');
      const tabs = await chrome.tabs.query({});
      const validTabs = tabs.filter(tab => isValidPage(tab.url));

      console.log(`Found ${validTabs.length} valid tabs out of ${tabs.length} total`);

      for (const tab of validTabs) {
        try {
          const pageStateAsString = await sendMessage('getPageStateAsString', undefined, tab.id);
          console.log("pageStateAsString", pageStateAsString)
        } catch (error) {
          console.log(`❌ ${tab.id}: No content script`);
        }
      }
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


  // Chat handler - now with proper state management
  onMessage('chat', async ({ data: { message } }) => {
    console.log('💬 Starting chat process:', message);
    // Add user message to chat and set thinking to true simultaneously
    await stateManager.updateState({
      isThinking: true,
      chatMessages: [...stateManager.state.chatMessages, {
        id: `msg-${Date.now()}`,
        type: MESSAGE_TYPES.USER,
        content: message,
        timestamp: Date.now()
      }]
    });

    const state = await stateManager.getState()
    const { useSearch, useAgent, actionsExecuted } = state

    if (useAgent) {
      await stateManager.setTask(message);
    }

    const messageToSend: string = PromptBuilder.buildMessage(message, state)

    try {
      // Process the chat
      const result: Promise<ApiResponse<ChatResponse>> = await withAuth(async () => {
        return await ChatManager.sendMessage(messageToSend, { useSearch });
      });

      console.log('✅ Chat completed successfully');
      // Add assistant response to chat messages
      await stateManager.addChatMessage({
        id: `msg-${Date.now()}`,
        type: MESSAGE_TYPES.ASSISTANT,
        content: (await result).data?.reply.trim(),
        timestamp: Date.now()
      });
      return result;

    } catch (error) {
      // Make sure to clear thinking state on error
      console.error('❌ Chat failed:', error);
      throw error;
    } finally {
      await stateManager.setThinking(false);
    }
  });

  onMessage('loadAppState', () => {
    console.log('📤 Loading app state from background');
    return stateManager.getState();
  });

  // Save app state
  onMessage('saveAppState', async (message) => {
    console.log('💾 Saving app state to background:', message.data);
    await stateManager.setState(message.data);
  });

  onMessage('onUpdateAppState', async ({ data: updates }) => {
    console.log('🔄 Updating app state:', updates);
    await stateManager.updateState(updates);
  });

  onMessage('addChatMessage', async (message) => {
    console.log('➕ Adding chat message');
    await stateManager.addChatMessage(message.data);
  });

  onMessage('clearChatMessages', async () => {
    console.log('🗑️ Clearing chat messages');
    await stateManager.clearChatMessages();
  });

  // Additional state management handlers
  // onMessage('updateChatState', async ({ data }) => {
  //   await stateManager.updateChatState(data);
  // });

  // onMessage('updateModeState', async ({ data }) => {
  //   await stateManager.updateModeState(data);
  // });

  // onMessage('updateFileState', async ({ data }) => {
  //   await stateManager.updateFileState(data);
  // });

  // onMessage('updateUIState', async ({ data }) => {
  //   await stateManager.updateUIState(data);
  // });

  // onMessage('updateAgentState', async ({ data }) => {
  //   await stateManager.updateAgentState(data);
  // });

})