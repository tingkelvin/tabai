import React, { useState, useEffect } from 'react';
import useAuth from './hooks/useAuth';
import useSettings from './hooks/useSettings';
import Header from './components/Header';
import AuthError from './components/AuthError';
import Announcements from './components/Announcements';
import QuickLinks from './components/QuickLinks';
import Footer from './components/Footer';
import Settings from './components/Settings';

interface ChromeTab {
  id?: number;
  [key: string]: any;
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ChromeTab | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const { settings } = useSettings();

  // Use the enhanced auth hook that coordinates with background script
  const {
    user,
    isAuthenticated,
    isLoading: isAuthenticating,
    authError,
    login,
    logout,
    clearError
  } = useAuth();

  useEffect(() => {
    initializePopup();
  }, []);

  // Apply dark mode to popup
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings.darkMode]);

  // Sync extension state with authentication status
  useEffect(() => {
    if (!isAuthenticated && !isAuthenticating) {
      // User has logged out or is not authenticated, disable the extension
      disableExtensionOnLogout();
    } else if (isAuthenticated) {
      // User is authenticated, check if extension should be enabled
      syncExtensionState();
    }
  }, [isAuthenticated, isAuthenticating]);

  const initializePopup = async () => {
    try {
      // Get current tab information
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: ChromeTab[]) => {
        if (tabs[0]) {
          setCurrentTab(tabs[0]);
        }
      });

      // Get extension state from storage - but only set it if user is authenticated
      // The useAuth hook will determine authentication status
      const result = await chrome.storage.sync.get(['extensionEnabled']);

      // Only set as active if the stored value is explicitly true and user will be authenticated
      setIsActive(result.extensionEnabled === true);

    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  };

  const syncExtensionState = async () => {
    try {
      // When user is authenticated, check the stored extension state
      const result = await chrome.storage.sync.get(['extensionEnabled']);
      const storedState = result.extensionEnabled;

      // If no stored state, default to true for authenticated users
      const shouldBeActive = storedState !== false;
      setIsActive(shouldBeActive);

      // Ensure storage reflects the current state
      if (storedState === undefined) {
        await chrome.storage.sync.set({ extensionEnabled: shouldBeActive });
      }
    } catch (error) {
      console.error('Error syncing extension state:', error);
    }
  };

  const handleGoogleLogin = async () => {
    const result = await login();

    // If login successful, optionally enable extension by default
    if (result && result.success) {
      setIsActive(true);
      await chrome.storage.sync.set({ extensionEnabled: true });
      await notifyContentScript('TOGGLE_EXTENSION', { enabled: true });
    }
  };

  const handleLogout = async () => {
    const result = await logout();

    // After successful logout, the useEffect will handle disabling the extension
    if (result && result.success) {
      console.log('Logout successful');
    }
  };

  const disableExtensionOnLogout = async () => {
    try {
      setIsActive(false);
      await chrome.storage.sync.set({ extensionEnabled: false });
      await notifyContentScript('TOGGLE_EXTENSION', { enabled: false });
    } catch (error) {
      console.error('Error disabling extension on logout:', error);
    }
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const toggleExtension = async () => {
    // Only allow toggling if user is authenticated
    if (!isAuthenticated) {
      console.warn('User must be authenticated to toggle extension');
      return;
    }

    try {
      const newState = !isActive;
      setIsActive(newState);

      await chrome.storage.sync.set({ extensionEnabled: newState });
      await notifyContentScript('TOGGLE_EXTENSION', { enabled: newState });

      // Also notify background script about the state change
      await sendMessageToBackground('EXTENSION_TOGGLED', { enabled: newState });

    } catch (error) {
      console.error('Error toggling extension:', error);
      // Revert state on error
      setIsActive(!isActive);
    }
  };

  // Helper function to send messages to content script
  const notifyContentScript = async (type: string, data: Record<string, any> = {}) => {
    if (currentTab && typeof currentTab.id === 'number') {
      try {
        await chrome.tabs.sendMessage(currentTab.id, { type, ...data });
      } catch (error) {
        console.log('Could not send message to content script:', error);
      }
    }
  };

  // Helper function to send messages to background script
  const sendMessageToBackground = async (type: string, data: Record<string, any> = {}) => {
    try {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type, data }, (response: any) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error('Error sending message to background:', error);
    }
  };

  return (
    <div className="min-w-[28rem] bg-gradient-to-br from-slate-50 to-white shadow-2xl overflow-visible border border-slate-200/50 flex flex-col">
      <Header
        isAuthenticated={isAuthenticated}
        isActive={isActive}
        isAuthenticating={isAuthenticating}
        onToggleExtension={toggleExtension}
        onOpenSettings={openSettings}
        onLogout={handleLogout}
        onGoogleLogin={handleGoogleLogin}
      />

      <div className="p-6 space-y-6 flex-1">
        <AuthError error={authError} onClear={clearError} />
        <Announcements />
        <QuickLinks />
        <Footer />
      </div>

      <Settings isOpen={isSettingsOpen} onClose={closeSettings} />
    </div>
  );
};

export default App; 