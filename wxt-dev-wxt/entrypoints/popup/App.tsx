import React, { useState, useEffect } from 'react';
import { sendMessage } from '@/entrypoints/background/types/messages';
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
  const {
    user,
    isAuthenticated,
    isLoading: isAuthenticating,
    authError,
    login,
    logout,
    clearError
  } = useAuth();

  // WXT Storage
  const extensionStorage = storage.defineItem<boolean>('sync:extensionEnabled');

  useEffect(() => {
    initializePopup();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings.darkMode]);

  useEffect(() => {
    if (!isAuthenticated && !isAuthenticating) {
      disableExtensionOnLogout();
    } else if (isAuthenticated) {
      syncExtensionState();
    }
  }, [isAuthenticated, isAuthenticating]);

  const initializePopup = async () => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: ChromeTab[]) => {
        if (tabs[0]) {
          setCurrentTab(tabs[0]);
        }
      });

      const enabled = await extensionStorage.getValue();
      setIsActive(enabled === true);
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  };

  const syncExtensionState = async () => {
    try {
      const storedState = await extensionStorage.getValue();
      const shouldBeActive = storedState !== false;

      setIsActive(shouldBeActive);

      if (storedState === null) {
        await extensionStorage.setValue(shouldBeActive);
      }
    } catch (error) {
      console.error('Error syncing extension state:', error);
    }
  };

  const handleGoogleLogin = async () => {
    const result = await login();
    if (result?.success) {
      setIsActive(true);
      await extensionStorage.setValue(true);
      await notifyContentScript(true);
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result && result.success) {
      console.log('Logout successful');
    }
  };

  const disableExtensionOnLogout = async () => {
    try {
      setIsActive(false);
      await extensionStorage.setValue(false);
      await notifyContentScript(false);
    } catch (error) {
      console.error('Error disabling extension on logout:', error);
    }
  };

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  const toggleExtension = async () => {
    if (!isAuthenticated) {
      console.warn('User must be authenticated to toggle extension');
      return;
    }

    try {
      const newState = !isActive;
      setIsActive(newState);

      await extensionStorage.setValue(newState);
      await notifyContentScript(newState);
    } catch (error) {
      console.error('Error toggling extension:', error);
      setIsActive(!isActive);
    }
  };

  const notifyContentScript = async (enabled: boolean) => {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (currentTab?.id) {
        try {
          await sendMessage('toggleExtension', { enabled }, tab.id);
        } catch (error) {
          console.log('Could not send message to content script:', error);
        }
      }
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