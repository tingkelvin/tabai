import React, { useState, useEffect } from 'react';
import { Brain, Zap, Settings, ExternalLink, Sparkles } from 'lucide-react';

const PopupApp = () => {
  const [currentTab, setCurrentTab] = useState(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setCurrentTab(tabs[0]);
      }
    });

    // Get extension state from storage
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      setIsActive(result.extensionEnabled !== false); // Default to true
    });
  }, []);

  const openAITools = () => {
    // Logic to open AI tools interface
    console.log('Opening AI Tools...');
    // In a real extension, this would inject content script or open side panel
  };

  const openSettings = () => {
    // Logic to open settings
    console.log('Opening Settings...');
  };

  const toggleExtension = async () => {
    const newState = !isActive;
    setIsActive(newState);
    
    // Save state to storage
    chrome.storage.sync.set({ extensionEnabled: newState });
    
    // Send message to content script
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
  };

  return (
    <div className="w-80 bg-white">
      {/* Header */}
      <div className="bg-gray-50 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-gray-900">AI Tools</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              {isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Quick Access */}
        <div className="mb-6">
          <button 
            onClick={openAITools}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-xl font-medium border border-blue-200 hover:border-blue-300 transition-all duration-200 flex items-center justify-center gap-3"
          >
            <Sparkles className="w-5 h-5" />
            Launch AI Tools
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Google Login */}
        <div className="mb-6">
          <button 
            onClick={() => console.log('Google login clicked')}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 p-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-gray-700">Quick Actions</h3>
          
          <button 
            onClick={toggleExtension}
            className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 ${
              isActive 
                ? 'border-red-200 text-red-600 hover:bg-red-50' 
                : 'border-green-200 text-green-600 hover:bg-green-50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-400' : 'bg-green-400'}`}></div>
            <span className="text-sm font-medium">
              {isActive ? 'Disable Extension' : 'Enable Extension'}
            </span>
          </button>

          <button 
            onClick={openSettings}
            className="w-full p-3 rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200 flex items-center gap-3"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>

        {/* Usage Tip */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Quick Tip</p>
              <p>Use <kbd className="bg-white px-1 py-0.5 rounded text-xs border border-blue-200">Ctrl+Shift+A</kbd> to instantly access AI tools on any page.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupApp;