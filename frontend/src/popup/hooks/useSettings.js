import { useState, useEffect } from 'react';

const defaultSettings = {
  darkMode: false,
  notifications: true,
  dataCollection: false
};

const useSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from background script on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_USER_SETTINGS' });
        if (response.success) {
          setSettings(response.settings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Listen for settings changes from other parts of the extension
    const handleSettingsUpdate = (message) => {
      if (message.type === 'SETTINGS_UPDATED') {
        setSettings(message.settings);
      }
    };

    chrome.runtime.onMessage.addListener(handleSettingsUpdate);
    return () => chrome.runtime.onMessage.removeListener(handleSettingsUpdate);
  }, []);

  // Update a single setting through the background script
  const updateSetting = async (key, value) => {
    try {
      const newSettings = {
        ...settings,
        [key]: value
      };
      
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_USER_SETTINGS',
        data: { settings: newSettings }
      });

      if (response.success) {
        setSettings(newSettings);
      } else {
        throw new Error(response.message || 'Failed to save settings');
      }
      
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      // Revert the setting on error
      setSettings(prevSettings => ({
        ...prevSettings,
        [key]: !value
      }));
    }
  };

  return {
    settings,
    isLoading,
    updateSetting
  };
};

export default useSettings; 