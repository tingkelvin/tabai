// background.js - Main entry point
import { messageHandler } from './handlers/MessageHandler.js';
import { extensionLifecycleManager } from './handlers/ExtensionLifecycleManager.js';

// console.log('✅ Background script loaded successfully!');

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('📨 Received message in background:', message);
  
  messageHandler.handle(message, sender, sendResponse);
  return true; // Keep message channel open for async responses
});

// Extension lifecycle events
chrome.runtime.onInstalled.addListener((details) => {
  extensionLifecycleManager.handleInstalled(details);
});

chrome.runtime.onStartup.addListener(() => {
  extensionLifecycleManager.handleStartup();
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  extensionLifecycleManager.handleStorageChanges(changes, namespace);
});