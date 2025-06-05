import AuthManager from "./AuthManager.js";

console.log('✅ Background script loaded successfully!');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message in background:', message);

  switch (message.type) {
    case 'CHECK_AUTH':
      handleCheckAuth(sendResponse);
      break;
    
    case 'AUTHENTICATE':
      handleAuthentication(sendResponse);
      break;

    case 'LOGOUT':
      handleLogout(sendResponse);
      break;

    case 'REFRESH_TOKEN':
      handleRefreshToken(sendResponse);
      break;

    case 'GET_AUTH_TOKEN':
      handleGetAuthToken(sendResponse);
      break;

    case 'CHAT_MESSAGE':
      handleChatMessage(message.data, sendResponse);
      break;
    
    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      break;
    
    case 'SAVE_SETTINGS':
      handleSaveSettings(message.data, sendResponse);
      break;

    case 'EXTENSION_TOGGLED':
      handleExtensionToggled(message.data, sendResponse);
      break;

    case 'TEST_CONNECTION':
      console.log('🧪 Test connection requested...');
      sendResponse({
        success: true,
        message: 'Connection test successful!',
        authManagerLoaded: !!AuthManager,
        timestamp: Date.now()
      });
      break;
    
    default:
      console.warn('❓ Unknown message type:', message.type);
      sendResponse({ 
        error: 'Unknown message type',
        receivedType: message.type 
      });
  }

  return true;
});

// Auth-related handlers
async function handleCheckAuth(sendResponse) {
  try {
    console.log('🔍 Checking auth status...');
    
    if (!AuthManager) {
      sendResponse({
        isAuthenticated: false,
        user: null,
        error: 'AuthManager not available'
      });
      return;
    }

    const authStatus = await AuthManager.checkAuthStatus();
    console.log('✅ Auth status:', authStatus);
    sendResponse(authStatus);
  } catch (error) {
    console.error('❌ Auth check error:', error);
    sendResponse({
      isAuthenticated: false,
      user: null,
      error: error.message
    });
  }
}

async function handleAuthentication(sendResponse) {
  try {
    console.log('🔐 Authentication requested...');
    
    if (!AuthManager) {
      sendResponse({
        success: false,
        error: 'AuthManager not available'
      });
      return;
    }

    const result = await AuthManager.authenticateWithGoogle();
    
    if (result.success) {
      await AuthManager.notifyContentScripts('AUTH_SUCCESS', { user: result.user });
      notifyExtensionParts('AUTH_SUCCESS', { user: result.user });
      
      sendResponse({
        success: true,
        user: result.user,
        message: 'Authentication successful'
      });
    } else {
      notifyExtensionParts('AUTH_ERROR', { error: result.error });
      
      sendResponse({
        success: false,
        error: result.error,
        message: 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    notifyExtensionParts('AUTH_ERROR', { error: error.message });
    
    sendResponse({
      success: false,
      error: error.message,
      message: 'Authentication failed'
    });
  }
}

async function handleLogout(sendResponse) {
  try {
    console.log('👋 Logout requested...');
    
    if (!AuthManager) {
      sendResponse({
        success: false,
        error: 'AuthManager not available'
      });
      return;
    }

    const success = await AuthManager.logout();
    
    if (success) {
      await AuthManager.notifyContentScripts('AUTH_LOGOUT');
      notifyExtensionParts('AUTH_LOGOUT');
      
      sendResponse({
        success: true,
        message: 'Logged out successfully'
      });
    } else {
      sendResponse({
        success: false,
        message: 'Logout failed'
      });
    }
  } catch (error) {
    console.error('❌ Logout error:', error);
    sendResponse({
      success: false,
      error: error.message,
      message: 'Logout failed'
    });
  }
}

async function handleRefreshToken(sendResponse) {
  try {
    console.log('🔄 Token refresh requested...');
    
    if (!AuthManager) {
      sendResponse({ success: false, error: 'AuthManager not available' });
      return;
    }

    const success = await AuthManager.refreshToken();
    sendResponse({ success });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetAuthToken(sendResponse) {
  try {
    if (!AuthManager) {
      sendResponse({ token: null, error: 'AuthManager not available' });
      return;
    }

    const token = await AuthManager.getBearerToken();
    sendResponse({ token });
  } catch (error) {
    sendResponse({ token: null, error: error.message });
  }
}

// Chat message handler
async function handleChatMessage(data, sendResponse) {
  try {
    console.log('💬 Processing chat message:', data.message);
    
    if (!AuthManager) {
      sendResponse({
        success: false,
        error: 'Authentication system not available',
        content: "Authentication system is not available. Please refresh the extension.",
      });
      return;
    }
    
    const authStatus = await AuthManager.checkAuthStatus();
    
    if (!authStatus.isAuthenticated) {
      sendResponse({
        success: false,
        error: 'Authentication required',
        content: "Please log in to use the chat feature.",
        requiresAuth: true
      });
      return;
    }

    // For now, return a mock response
    // TODO: Replace with actual API call
    const mockResponse = `Thanks for your message: "${data.message}". This is a mock response while we're setting up the real AI integration.`;
    
    sendResponse({
      success: true,
      content: mockResponse,
      timestamp: Date.now(),
      isMockResponse: true
    });

  } catch (error) {
    console.error('❌ Error processing chat message:', error);
    sendResponse({
      success: false,
      error: error.message,
      content: "I'm sorry, I encountered an error processing your message."
    });
  }
}

// Settings handlers
async function handleGetSettings(sendResponse) {
  try {
    const authStatus = AuthManager ? await AuthManager.checkAuthStatus() : { isAuthenticated: false, user: null };
    
    chrome.storage.sync.get(['chatSettings'], (result) => {
      sendResponse({
        success: true,
        settings: result.chatSettings || {},
        user: authStatus.user,
        isAuthenticated: authStatus.isAuthenticated
      });
    });
  } catch (error) {
    console.error('❌ Error getting settings:', error);
    chrome.storage.sync.get(['chatSettings'], (result) => {
      sendResponse({
        success: true,
        settings: result.chatSettings || {},
        user: null,
        isAuthenticated: false
      });
    });
  }
}

async function handleSaveSettings(data, sendResponse) {
  try {
    chrome.storage.sync.set({ chatSettings: data.settings }, () => {
      sendResponse({
        success: true,
        message: 'Settings saved successfully'
      });
    });
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    sendResponse({
      success: false,
      error: error.message,
      message: 'Failed to save settings'
    });
  }
}

// Extension toggle handler
async function handleExtensionToggled(data, sendResponse) {
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
      error: error.message
    });
  }
}

// Helper function to notify extension parts
function notifyExtensionParts(type, data = {}) {
  chrome.runtime.sendMessage({ type, ...data }).catch(() => {
    // Ignore errors if no listeners are active
  });
}

// Extension lifecycle handlers
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('📦 Extension installed/updated:', details.reason);
  
  if (AuthManager) {
    const authStatus = await AuthManager.checkAuthStatus();
    console.log('🔍 Initial auth status:', authStatus);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('🔄 Extension starting up');
  
  if (AuthManager) {
    const authStatus = await AuthManager.checkAuthStatus();
    if (authStatus.isAuthenticated) {
      await AuthManager.refreshToken();
    }
  }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    const authKeys = ['bearerToken', 'userInfo', 'tokenExpiry'];
    const hasAuthChanges = authKeys.some(key => changes[key]);
    
    if (hasAuthChanges) {
      console.log('🔄 Auth state changed in storage');
      notifyExtensionParts('AUTH_STATE_CHANGED');
      
      if (AuthManager) {
        AuthManager.notifyContentScripts('AUTH_STATE_CHANGED');
      }
    }
  }
});