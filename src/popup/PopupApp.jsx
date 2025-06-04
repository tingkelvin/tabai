import React, { useState, useEffect } from 'react';

const PopupApp = () => {
  const [currentTab, setCurrentTab] = useState(null);

  useEffect(() => {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setCurrentTab(tabs[0]);
      }
    });
  }, []);

  const reloadContentScript = async () => {
    if (currentTab) {
      try {
        await chrome.tabs.reload(currentTab.id);
        window.close(); // Close popup after reload
      } catch (error) {
        console.error('Failed to reload tab:', error);
      }
    }
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h2>React Extension</h2>
        <div className="status-indicator">
          <span className="status-dot"></span>
          Active
        </div>
      </div>
      
      <div className="popup-content">
        <div className="info-card">
          <h3>Current Page</h3>
          <p className="url-display">
            {currentTab ? new URL(currentTab.url).hostname : 'Loading...'}
          </p>
        </div>
        
        <div className="actions">
          <button className="action-button" onClick={reloadContentScript}>
            Reload Extension
          </button>
        </div>
        
        <div className="help-text">
          <p>The React widget should appear in the top-right corner of the current page.</p>
          <p>If you don't see it, try clicking "Reload Extension".</p>
        </div>
      </div>
    </div>
  );
};

export default PopupApp;