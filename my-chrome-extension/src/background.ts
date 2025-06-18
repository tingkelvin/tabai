chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
  });
  
  chrome.action.onClicked.addListener((tab) => {
    // Handle extension icon click
    console.log('Extension clicked', tab);
  });