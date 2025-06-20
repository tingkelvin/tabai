// handlers/ExtensionHandler.ts
import AuthManager from '../managers/authManager';

interface ToggleData {
  enabled: boolean;
}

interface ExtensionResponse {
  success: boolean;
  message?: string;
  error?: string;
  authManagerLoaded?: boolean;
  timestamp?: number;
}

type SendResponse = (response: ExtensionResponse) => void;

export const extensionHandler = {
  handleToggle: async (data: ToggleData, sendResponse: SendResponse): Promise<void> => {
    try {
      console.log('🔧 Extension toggled:', data.enabled);
      sendResponse({
        success: true,
        message: `Extension ${data.enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('❌ Error handling extension toggle:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  testConnection: (sendResponse: SendResponse): void => {
    console.log('🧪 Test connection requested...');
    sendResponse({
      success: true,
      message: 'Connection test successful!',
      authManagerLoaded: !!AuthManager,
      timestamp: Date.now()
    });
  }
};