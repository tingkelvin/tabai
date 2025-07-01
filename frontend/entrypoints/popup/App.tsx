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

const App: React.FC = () => {
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
    if (isAuthenticated) {
      sendMessage('toggleExtension', { enabled: true });
    }
  }, [isActive]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings.darkMode]);

  const initializePopup = async () => {
    try {
      const enabled = await extensionStorage.getValue();
      setIsActive(enabled === true);
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  };

  const handleGoogleLogin = async () => {
    const result = await login();
    if (result?.success) {
      setIsActive(true);
      sendMessage('toggleExtension', { enabled: true });
    }
  };

  const handleLogout = async () => {
    console.log('Logging out user:', user?.email || 'Unknown User');
    const result = await logout();
    if (result && result.success) {
      console.log('Logout successful');
    }
    sendMessage('toggleExtension', { enabled: false });
  };

  const disableExtensionOnLogout = async () => {
    try {
      console.log('Disabling extension on logout');
      setIsActive(false);
      sendMessage('toggleExtension', { enabled: false });
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

      sendMessage('toggleExtension', { enabled: newState });
    } catch (error) {
      console.error('Error toggling extension:', error);
      setIsActive(!isActive);
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