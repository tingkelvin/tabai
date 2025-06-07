// hooks/useYouTubeTranscript.js - Extracted transcript functionality
import { useState } from 'react';
import { parseTimeToSeconds } from '../utils/helpers';
import { isRealSpeech } from '../utils/transcriptHelpers'

export const useYoutubeTranscript = () => {
  const [transcript, setTranscript] = useState([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  // Helper function to wait for elements to appear in DOM
  const waitForElement = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  };

  // Close transcript panel after getting data
  const closeTranscriptPanel = async () => {
    try {
      const closeButton = document.querySelector('[aria-label*="close transcript" i], [aria-label*="Close transcript" i]');
      if (closeButton) {
        closeButton.click();
        console.log('Closed transcript panel');
      }
    } catch (error) {
      console.error('Error closing transcript panel:', error);
    }
  };

  // Main function to get YouTube transcript
  const getYoutubeTranscript = async () => {
    if (isLoadingTranscript) {
      console.log('Already loading transcript, skipping...');
      return;
    }

    setIsLoadingTranscript(true);
    console.log("Getting transcript...");
    
    try {
      // Wait for page to fully load
      await waitForElement('[aria-label*="transcript" i], [aria-label*="Show transcript" i]', 5000);
      
      const transcriptButton = document.querySelector('[aria-label*="transcript" i], [aria-label*="Show transcript" i]');
    
      if (transcriptButton) {
        // Check if transcript panel is already open
        const isTranscriptOpen = document.querySelector('.ytd-transcript-renderer, ytd-transcript-renderer');
        
        if (!isTranscriptOpen) {
          transcriptButton.click();
          console.log('Clicked transcript button');
          
          // Wait for transcript panel to load
          await waitForElement('ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer', 3000);
        }
    
        const transcriptItems = document.querySelectorAll(
          'ytd-transcript-segment-renderer'
        );
    
        if (transcriptItems.length > 0) {
          const transcriptData = Array.from(transcriptItems).map(item => {
            const timeElement = item.querySelector('.segment-timestamp, [class*="timestamp"]');
            const textElement = item.querySelector('.segment-text, [class*="text"]');
            
            const timeText = timeElement ? timeElement.textContent.trim() : '0:00';
            const text = textElement ? textElement.textContent.trim() : '';
    
            return {
              time: timeText,
              text: text,
              timeInSeconds: parseTimeToSeconds(timeText) // Parse immediately
            };
          }).filter(item => item.text && isRealSpeech(item.text));
    
          console.log(`Found ${transcriptData.length} transcript segments`);
          
          setTranscript(transcriptData); // Now contains pre-parsed timeInSeconds
          console.log(transcriptData);
          
          // Close transcript panel after getting data
          await closeTranscriptPanel();
          return transcriptData;
        } else {
          throw new Error('No transcript segments found');
        }
      } else {
        throw new Error('Transcript button not found');
      }
    } catch (error) {
      console.error('Failed to get transcript:', error);
      setTranscript([{ 
        time: '0:00', 
        text: `Transcript not available: ${error.message}`,
        timeInSeconds: 0
      }]);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // Clear transcript (useful when changing videos)
  const clearTranscript = () => {
    setTranscript([]);
  };

  return {
    transcript,
    isLoadingTranscript,
    getYoutubeTranscript,
    clearTranscript
  };
};