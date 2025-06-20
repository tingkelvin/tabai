// services/NotificationService.ts

interface NotificationData {
  [key: string]: any;
}

interface NotificationMessage {
  type: string;
  [key: string]: any;
}

export const notificationService = {
  notifyExtensionParts: (type: string, data: NotificationData = {}): void => {
    chrome.runtime.sendMessage({ type, ...data }).catch(() => {
      // Ignore errors if no listeners are active
    });
  },

  notifyContentScripts: async (type: string, data: NotificationData = {}): Promise<void> => {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        try {
          if (tab.id) {
            await chrome.tabs.sendMessage(tab.id, { type, ...data });
          }
        } catch (error) {
          // Ignore errors for tabs without content scripts
        }
      }
    } catch (error) {
      console.error('Error notifying content scripts:', error);
    }
  },

  notifyActiveTab: async (type: string, data: NotificationData = {}): Promise<void> => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tabs[0]?.id) {
        await chrome.tabs.sendMessage(tabs[0].id, { type, ...data });
      }
    } catch (error) {
      console.log('Could not notify active tab:', error);
    }
  }
};