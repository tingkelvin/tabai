// Background script for Chrome extension
console.log('Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Show welcome notification or setup
    console.log('Welcome to React Chrome Extension!');
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  // Handle different message types
  switch (request.type) {
    case 'GET_TAB_INFO':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ tab: tabs[0] });
      });
      return true; // Keep message channel open for async response
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});