import React, { useState, useEffect } from 'react';
import { Settings, User, LogOut, AlertCircle, Zap, ZapOff } from 'lucide-react';
import useAuth from './useAuth';
import { CustomIcon } from './CustomIcon';

const PopupApp = () => {
  const [currentTab, setCurrentTab] = useState(null);
  const [isActive, setIsActive] = useState(true);
  
  // Use the auth hook instead of direct AuthManager calls
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

  // Disable extension when user logs out
  useEffect(() => {
    if (!isAuthenticated && !isAuthenticating) {
      // User has logged out, disable the extension
      disableExtensionOnLogout();
    }
  }, [isAuthenticated, isAuthenticating]);

  const initializePopup = async () => {
    try {
      // Get current tab information
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          setCurrentTab(tabs[0]);
        }
      });

      // Get extension state from storage
      const result = await chrome.storage.sync.get(['extensionEnabled']);
      setIsActive(result.extensionEnabled !== false);

    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  };

  const handleGoogleLogin = async () => {
    await login();
  };

  const handleLogout = async () => {
    await logout();
  };

  const disableExtensionOnLogout = async () => {
    try {
      setIsActive(false);
      await chrome.storage.sync.set({ extensionEnabled: false });
      
      if (currentTab) {
        try {
          await chrome.tabs.sendMessage(currentTab.id, {
            type: 'TOGGLE_EXTENSION',
            enabled: false
          });
        } catch (error) {
          console.log('Could not send message to content script:', error);
        }
      }
    } catch (error) {
      console.error('Error disabling extension on logout:', error);
    }
  };

  const openSettings = () => {
    console.log('Opening Settings...');
  };

  const toggleExtension = async () => {
    try {
      const newState = !isActive;
      setIsActive(newState);
      
      await chrome.storage.sync.set({ extensionEnabled: newState });
      
      if (currentTab) {
        try {
          await chrome.tabs.sendMessage(currentTab.id, {
            type: 'TOGGLE_EXTENSION',
            enabled: newState
          });
        } catch (error) {
          console.log('Could not send message to content script:', error);
        }
      }
    } catch (error) {
      console.error('Error toggling extension:', error);
    }
  };

  const statusConfig = {
    running: {
      color: 'emerald',
      icon: 'bg-emerald-500',
      text: 'Running',
      gradient: 'from-emerald-500 to-teal-600'
    },
    stopped: {
      color: 'slate',
      icon: 'bg-slate-400',
      text: 'Stopped',
      gradient: 'from-slate-400 to-slate-500'
    }
  };

  const currentStatus = isActive ? statusConfig.running : statusConfig.stopped;

  return (
    <div className="w-96 bg-gradient-to-br from-slate-50 to-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200/50">
      {/* Header with Glass Effect */}
      <div className="relative bg-white/80 backdrop-blur-xl p-6 border-b border-slate-200/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        
        <div className="relative flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${currentStatus.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
            {/* Replace Brain icon with CustomIcon */}
            <CustomIcon className="w-6 h-6" color="white" />
          </div>
          
          <div className="flex-1">
            <h1 className="font-bold text-xl text-slate-900 mb-1">Tab</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.icon} shadow-sm`}></div>
              <span className="text-sm font-medium text-slate-600">{currentStatus.text}</span>
            </div>
          </div>
          
          {/* User Avatar */}
          {isAuthenticated && user && (
            <div className="flex items-center gap-2">
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info Card */}
        {isAuthenticated && user && (
          <div className="relative bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 mb-0.5">{user.name}</p>
                <p className="text-xs text-slate-600">{user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                disabled={isAuthenticating}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Authentication Error */}
        {authError && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-red-900 mb-1">Authentication Error</p>
                <p className="text-red-700">{authError}</p>
              </div>
              <button 
                onClick={clearError}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Google Login */}
        {!isAuthenticated && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Welcome Tabber</p>
              <p className="text-xs text-slate-500">Sign in to tab</p>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              disabled={isAuthenticating}
              className="w-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-700 p-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Extension Controls - Only show when authenticated */}
        {isAuthenticated && (
          <div className="space-y-4">
            <div className="space-y-3">
              <button 
                onClick={toggleExtension}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 group shadow-sm hover:shadow-md ${
                  isActive 
                    ? 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 hover:from-red-100 hover:to-rose-100' 
                    : 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 hover:from-emerald-100 hover:to-teal-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                  isActive ? 'bg-red-100' : 'bg-emerald-100'
                }`}>
                  {isActive ? (
                    <ZapOff className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">
                    {isActive ? 'Stop Tab' : 'Launch Tab'}
                  </p>
                  <p className="text-xs opacity-75">
                    {isActive ? 'Stop tabbing' : 'Start tabbing'}
                  </p>
                </div>
              </button>

              <button 
                onClick={openSettings}
                className="w-full p-4 rounded-xl border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 hover:from-slate-100 hover:to-slate-200 transition-all duration-300 flex items-center gap-4 group shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shadow-sm">
                  <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Settings</p>
                  <p className="text-xs text-slate-600">Comming soon...</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupApp;