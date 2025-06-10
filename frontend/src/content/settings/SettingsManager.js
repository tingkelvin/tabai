// content/settings/SettingsManager.js

class SettingsManager {
  constructor() {
    this.initializeSettings();
    this.setupMessageListeners();
    this.setupSystemThemeListener();
  }

  initializeSettings = async () => {
    try {
      // Get initial settings from storage
      const result = await chrome.storage.sync.get(['userSettings']);
      const settings = result.userSettings || {};
      
      // If darkMode hasn't been set yet, initialize it based on system preference
      if (settings.darkMode === undefined) {
        settings.darkMode = this.getSystemThemePreference();
      }

      this.applySettings(settings);
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  }

  setupMessageListeners = () => {
    // Listen for settings changes
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED' && message.settings) {
        this.applySettings(message.settings);
      }
    });
  }

  setupSystemThemeListener = () => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', async (e) => {
      try {
        // Get current settings
        const result = await chrome.storage.sync.get(['userSettings']);
        const settings = result.userSettings || {};
        
        // Only update if following system theme
        if (settings.darkMode === undefined) {
          settings.darkMode = e.matches;
          this.applySettings(settings);
        }
      } catch (error) {
        console.error('Error handling system theme change:', error);
      }
    });
  }

  getSystemThemePreference = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  applySettings = (settings) => {
    // Apply dark mode
    const isDarkMode = settings.darkMode ?? this.getSystemThemePreference();
    this.applyDarkMode(isDarkMode);

    // Handle notifications
    if (settings.notifications !== undefined && settings.notifications) {
      this.handleNotifications();
    }
  }

  applyDarkMode = (isDarkMode) => {
    // Apply dark mode using data-theme attribute
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');

    // You might also want to dispatch a custom event for other parts of your app
    document.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { isDarkMode } 
    }));
  }

  handleNotifications = async () => {
    try {
      // Only request permission if not already granted or denied
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }
    } catch (error) {
      console.error('Error handling notifications:', error);
    }
  }
}

// Initialize settings manager
const settingsManager = new SettingsManager();
export default settingsManager; 