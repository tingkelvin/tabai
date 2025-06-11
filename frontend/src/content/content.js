// content.js - With toggle functionality
import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import YoutubeContentApp from './YoutubeContentApp';
import LinkedInContentApp from './LinkedinContentApp'
import './css/index.css';
import './settings/SettingsManager';
import { FileProvider } from './contexts/FileProvider';

let container = null;
let root = null;
let isExtensionEnabled = true;

// Function to create and show the extension
function showExtension() {
  if (container) return; // Already visible

  // Create container for React app
  container = document.createElement('div');
  container.id = 'react-extension-root';
  document.body.appendChild(container);

  // Create React root and render app
  root = createRoot(container);

  // Check if we're on YouTube and render appropriate component
  const isYouTube = window.location.hostname.includes('youtube.com');
  const isLinkedin = window.location.hostname.includes('linkedin.com');

  if (isYouTube) {
    root.render(<FileProvider><YoutubeContentApp /></FileProvider>);
  } else if (isLinkedin) {
    root.render(<FileProvider><LinkedInContentApp /></FileProvider>);
  } else {
    root.render(<FileProvider><ContentApp /></FileProvider>);
  }
}
// console.log(`React Chrome Extension loaded on ${isYouTube ? 'YouTube' : 'other site'}!`);

// Function to hide and cleanup the extension
function hideExtension() {
  if (!container) return; // Already hidden

  // Unmount React app
  if (root) {
    root.unmount();
    root = null;
  }

  // Remove container from DOM
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  container = null;

  // console.log('React Chrome Extension hidden!');
}

// Function to toggle extension visibility
function toggleExtension(enabled) {
  isExtensionEnabled = enabled;

  if (enabled) {
    showExtension();
  } else {
    hideExtension();
  }
}

// Listen for messages from popup/background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_EXTENSION') {
    toggleExtension(message.enabled);
    sendResponse({ success: true });
  }

  if (message.type === 'GET_EXTENSION_STATE') {
    sendResponse({ enabled: isExtensionEnabled });
  }
});

// Get initial state from storage and show extension if enabled
chrome.storage.sync.get(['extensionEnabled'], (result) => {
  const enabled = result.extensionEnabled !== false; // Default to true
  toggleExtension(enabled);
});

// Listen for storage changes (if settings are changed in other tabs)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.extensionEnabled) {
    toggleExtension(changes.extensionEnabled.newValue);
  }
});