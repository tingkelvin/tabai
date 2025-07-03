// background/stateManager.ts
import { sendMessage, onMessage } from '../types/messages';
import { ContentAppState } from '../types/state';

class BackgroundStateManager {
  private tabStates: Map<number, ContentAppState> = new Map();
  private readonly STORAGE_KEY = 'content_app_states';

  async initialize() {
    const result = await browser.storage.local.get(this.STORAGE_KEY);
    if (result[this.STORAGE_KEY]) {
      this.tabStates = new Map(Object.entries(result[this.STORAGE_KEY]).map(
        ([tabId, state]) => [parseInt(tabId), state as ContentAppState]
      ));
    }
  }

  async getState(tabId: number): Promise<ContentAppState | null> {
    return this.tabStates.get(tabId) || null;
  }

  async updateState(tabId: number, updates: Partial<ContentAppState>) {
    const currentState = this.tabStates.get(tabId);
    const newState = { ...currentState, ...updates };

    this.tabStates.set(tabId, newState);
    await this.saveToStorage();

    // Broadcast update to content script
    try {
      await sendMessage('stateUpdate', { updates }, { tabId });
    } catch (error) {
      console.warn('Failed to send state update to tab:', tabId, error);
    }
  }

  async resetState(tabId: number) {
    this.tabStates.delete(tabId);
    await this.saveToStorage();
  }

  private async saveToStorage() {
    const stateObject = Object.fromEntries(this.tabStates);
    await browser.storage.local.set({ [this.STORAGE_KEY]: stateObject });
  }

  async cleanup() {
    const tabs = await browser.tabs.query({});
    const activeTabs = new Set(tabs.map(tab => tab.id).filter(Boolean));

    for (const tabId of this.tabStates.keys()) {
      if (!activeTabs.has(tabId)) {
        this.tabStates.delete(tabId);
      }
    }

    await this.saveToStorage();
  }
}

export const stateManager = new BackgroundStateManager();

// Setup message handlers
export const setupStateHandlers = () => {
  onMessage('getContentState', async ({ sender }) => {
    const tabId = sender.tab?.id;
    if (!tabId) return { state: null };

    const state = await stateManager.getState(tabId);
    return { state };
  });

  onMessage('updateContentState', async ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (!tabId) return { success: false };

    await stateManager.updateState(tabId, data.updates);
    return { success: true };
  });

  onMessage('resetContentState', async ({ sender }) => {
    const tabId = sender.tab?.id;
    if (!tabId) return { success: false };

    await stateManager.resetState(tabId);
    return { success: true };
  });

  // Clean up on tab close
  browser.tabs.onRemoved.addListener((tabId) => {
    stateManager.resetState(tabId);
  });

  // Periodic cleanup
  setInterval(() => {
    stateManager.cleanup();
  }, 5 * 60 * 1000);
};