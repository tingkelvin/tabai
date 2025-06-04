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
    
    // Method 2: Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      console.log('PushState detected');
      setTimeout(updateUrlState, 100); // Small delay to ensure DOM is updated
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      console.log('ReplaceState detected');
      setTimeout(updateUrlState, 100);
    };
    
    // Method 3: Periodically check for URL changes (fallback)
    const urlCheckInterval = setInterval(() => {
      const currentHref = window.location.href;
      if (currentHref !== window.lastCheckedUrl) {
        console.log('URL change detected via polling');
        window.lastCheckedUrl = currentHref;
        updateUrlState();
      }
    }, 1000);
    
    // Method 4: Listen for hashchange
    const handleHashChange = () => {
      console.log('Hash change detected');
      updateUrlState();
    };
    
    // Add event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    
    // Store initial URL for polling comparison
    window.lastCheckedUrl = window.location.href;
    
    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      clearInterval(urlCheckInterval);
      
      // Restore original methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // Separate useEffect for YouTube-specific setup
  useEffect(() => {
    if (isYoutube) {
      checkYouTubePlayState();
      
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
      // Get video ID from URL
      const url = window.location.href;
      const videoId = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/)?.[1];
      
      if (!videoId) {
        throw new Error('Could not find video ID');
      }

      // Get the innertube API context from YouTube's window object
      const ytInitialData = window.ytInitialData;
      const innertubeApiKey = ytInitialData?.INNERTUBE_API_KEY || window.ytcfg?.get('INNERTUBE_API_KEY');
      const clientVersion = ytInitialData?.INNERTUBE_CLIENT_VERSION || window.ytcfg?.get('INNERTUBE_CLIENT_VERSION');
      const clientName = ytInitialData?.INNERTUBE_CLIENT_NAME || window.ytcfg?.get('INNERTUBE_CLIENT_NAME');
      
      if (!innertubeApiKey) {
        throw new Error('Could not find YouTube API key');
      }

      // Make request to YouTube's transcript endpoint
      const response = await fetch(`https://www.youtube.com/youtubei/v1/get_transcript?key=${innertubeApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: clientName || 'WEB',
              clientVersion: clientVersion || '2.20240304.00.00',
            },
          },
          params: btoa(JSON.stringify({ videoId })),
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transcript data');
      }

      const data = await response.json();
      
      // Parse the transcript data
      const transcriptData = [];
      const cues = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments || [];
      
      for (const cue of cues) {
        const snippet = cue?.transcriptSegmentRenderer;
        if (snippet?.snippet?.text && snippet?.startTimeText?.simpleText) {
          transcriptData.push({
            time: snippet.startTimeText.simpleText,
            text: snippet.snippet.text
          });
        }
      }

      if (transcriptData.length === 0) {
        throw new Error('No transcript data found in response');
      }

      setTranscript(transcriptData);
      return transcriptData;

    } catch (error) {
      console.error('Failed to get transcript:', error);
      setTranscript([{ 
        time: '0:00', 
        text: `Transcript not available: ${error.message}` 
      }]);
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