// handlers/ExtensionHandler.js
import AuthManager from '../AuthManager.js';

export const extensionHandler = {
  handleToggle: async (data, sendResponse) => {
    try {
      //console.log('🔧 Extension toggled:', data.enabled);
      sendResponse({
        success: true,
        message: `Extension ${data.enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('❌ Error handling extension toggle:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  },

  testConnection: (sendResponse) => {
    //console.log('🧪 Test connection requested...');
    sendResponse({
      success: true,
      message: 'Connection test successful!',
      authManagerLoaded: !!AuthManager,
      timestamp: Date.now()
    });
  }
};