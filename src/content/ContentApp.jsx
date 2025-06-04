import React, { useState, useEffect } from 'react';

const ContentApp = () => {
  const [count, setCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isYoutube, setIsYoutube] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  // Function to update URL state
  const updateUrlState = () => {
    const hostname = window.location.hostname;
    const fullUrl = window.location.href;
    
    setCurrentUrl(hostname);
    setIsYoutube(hostname.includes('youtube.com') || hostname.includes('youtu.be'));
    
    // Reset transcript when URL changes
    setTranscript([]);
    setShowTranscript(false);
    setIsLoadingTranscript(false);
    
    console.log('URL changed to:', fullUrl);
  };

  useEffect(() => {
    // Initial setup
    updateUrlState();
    
    // Method 1: Listen for popstate (back/forward buttons)
    const handlePopState = () => {
      console.log('Popstate detected');
      updateUrlState();
    };
    
    // // Method 2: Listen for pushstate/replacestate (programmatic navigation)
    // const originalPushState = history.pushState;
    // const originalReplaceState = history.replaceState;
    
    // history.pushState = function(...args) {
    //   originalPushState.apply(history, args);
    //   console.log('PushState detected');
    //   setTimeout(updateUrlState, 100); // Small delay to ensure DOM is updated
    // };
    
    // history.replaceState = function(...args) {
    //   originalReplaceState.apply(history, args);
    //   console.log('ReplaceState detected');
    //   setTimeout(updateUrlState, 100);
    // };
    
    // Method 3: Periodically check for URL changes (fallback)
    // const urlCheckInterval = setInterval(() => {
    //   const currentHref = window.location.href;
    //   if (currentHref !== window.lastCheckedUrl) {
    //     console.log('URL change detected via polling');
    //     window.lastCheckedUrl = currentHref;
    //     updateUrlState();
    //   }
    // }, 1000);
    
    // Method 4: Listen for hashchange
    // const handleHashChange = () => {
    //   console.log('Hash change detected');
    //   updateUrlState();
    // };
    
    // Add event listeners
    // window.addEventListener('popstate', handlePopState);
    // window.addEventListener('hashchange', handleHashChange);
    
    // // Store initial URL for polling comparison
    // window.lastCheckedUrl = window.location.href;
    
    // // Cleanup function
    // return () => {
    //   window.removeEventListener('popstate', handlePopState);
    //   window.removeEventListener('hashchange', handleHashChange);
    //   clearInterval(urlCheckInterval);
      
    //   // Restore original methods
    //   history.pushState = originalPushState;
    //   history.replaceState = originalReplaceState;
    // };
  }, []);

  // Separate useEffect for YouTube-specific setup
  useEffect(() => {
    if (isYoutube) {
      checkYouTubePlayState();
      getYouTubeTranscript();
      
      // Set up interval to check play state
      const interval = setInterval(checkYouTubePlayState, 1000);
      return () => clearInterval(interval);
    }
  }, [isYoutube, currentUrl]); // Re-run when URL changes

  const checkYouTubePlayState = () => {
    const video = document.querySelector('video');
    if (video) {
      setIsPlaying(!video.paused);
    }
  };

  const closeTranscriptPanel = async () => {
    const closeButton = document.querySelector('button[aria-label*="Close transcript" i]');
    if (closeButton) {
      console.log('Clicking close button');
      closeButton.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    }
    
    // If no close button found, try clicking the transcript button again to toggle it closed
    const transcriptButton = document.querySelector('[aria-label*="transcript" i], [aria-label*="Show transcript" i]');
    if (transcriptButton) {
      console.log('Toggling transcript button to close');
      transcriptButton.click();
      return true;
    }
    
    console.warn('Could not find close button for transcript panel');
    return false;
  };

  const getYouTubeTranscript = async () => {
    setIsLoadingTranscript(true);
    try {
      const transcriptButton = document.querySelector('[aria-label*="transcript" i], [aria-label*="Show transcript" i]');
      
      if (transcriptButton) {
        transcriptButton.click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const transcriptItems = document.querySelectorAll(
          'ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer'
        );
        
        if (transcriptItems.length > 0) {
          const transcriptData = Array.from(transcriptItems).map(item => {
            const timeElement = item.querySelector('.segment-timestamp, [class*="timestamp"]');
            const textElement = item.querySelector('.segment-text, [class*="text"]');
            
            return {
              time: timeElement ? timeElement.textContent.trim() : '0:00',
              text: textElement ? textElement.textContent.trim() : ''
            };
          }).filter(item => item.text);
          
          setTranscript(transcriptData);
          await closeTranscriptPanel();
          return transcriptData;
        }
      }
    
      throw new Error('No transcript found');
      
    } catch (error) {
      console.error('Failed to get transcript:', error);
      setTranscript([{ time: '0:00', text: 'Transcript not available for this video' }]);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const handleYouTubeToggle = () => {
    const video = document.querySelector('video');
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } else {
      const spaceKeyEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        keyCode: 32,
        which: 32,
        bubbles: true
      });
      document.dispatchEvent(spaceKeyEvent);
      
      setTimeout(checkYouTubePlayState, 100);
    }
  };

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleClose = () => {
    const container = document.getElementById('react-extension-root');
    if (container) {
      container.remove();
    }
  };

  return (
    <div className={`extension-widget ${isMinimized ? 'minimized' : ''}`}>
      <div className="extension-header">
        <div className="extension-controls">
          <button 
            className="close-btn"
            onClick={handleClose}
            title="Close"
          >
            ×
          </button>
          <button 
            className="minimize-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '□' : '−'}
          </button>
        </div>
        <h3>Terminal — {currentUrl}</h3>
      </div>
      
      <div className="extension-content">
        <div className="counter-section">
          <div className="counter-display">count: {count}</div>
          <div className="button-group">
            <button className="action-btn primary" onClick={handleIncrement}>
              increment
            </button>
            <button className="action-btn secondary" onClick={handleReset}>
              reset
            </button>
            {isYoutube && (
              <button className="action-btn youtube" onClick={handleYouTubeToggle}>
                {isPlaying ? 'pause' : 'play'}
              </button>
            )}
            {isYoutube && (
              <button 
                className="action-btn transcript" 
                onClick={() => {
                  if (!showTranscript && transcript.length === 0) {
                    getYouTubeTranscript();
                  }
                  setShowTranscript(!showTranscript);
                }}
                disabled={isLoadingTranscript}
              >
                {isLoadingTranscript ? 'loading...' : (showTranscript ? 'hide-txt' : 'transcript')}
              </button>
            )}
          </div>
        </div>
        
        {showTranscript && isYoutube && (
          <div className="transcript-section">
            <div className="transcript-header">
              <span className="prompt">$</span> transcript output:
            </div>
            <div className="transcript-content">
              {transcript.length > 0 ? (
                transcript.map((item, index) => (
                  <div key={index} className="transcript-line">
                    <span className="transcript-time">[{item.time}]</span>
                    <span className="transcript-text">{item.text}</span>
                  </div>
                ))
              ) : (
                <div className="transcript-loading">
                  {isLoadingTranscript ? 'Loading transcript...' : 'No transcript available'}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="info-section">
          <div className="url-info">
            <strong>pwd</strong>
            <span className="url-text">{currentUrl || 'localhost'}</span>
            {isYoutube && (
              <div style={{ marginTop: '8px' }}>
                <strong>media</strong>
                <span className="url-text">{isPlaying ? 'playing ▶️' : 'paused ⏸️'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentApp;