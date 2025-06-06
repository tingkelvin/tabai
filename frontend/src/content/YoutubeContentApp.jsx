// YouTubeContentApp.jsx - Clean version without duplicates
import React, { useState } from 'react';
import ContentApp from './ContentApp';
import { useYouTubeTranscript } from './hooks/useYoutubeTranscript';
import { useYouTubeChat } from './hooks/useYoutubeChat';

const YouTubeContentApp = () => {
  const [currentVideoId, setCurrentVideoId] = useState(null);

  // Helper function to extract video ID from URL
  const extractVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
    } catch (error) {
      console.error('Error extracting video ID:', error);
    }
    return null;
  };

  // Use the transcript hook
  const { 
    transcript, 
    isLoadingTranscript, 
    getYouTubeTranscript,
    clearTranscript 
  } = useYouTubeTranscript();

  // Use the YouTube chat hook with transcript
  const youTubeChatHook = useYouTubeChat(transcript);

  // URL change handler
  const handleUrlChange = (newUrl) => {
    console.log('URL changed to:', newUrl);
    const videoId = extractVideoId(newUrl);
    if (videoId) {
      // We're on a YouTube video page
      if (videoId !== currentVideoId) {
        // New video detected
        console.log('New video detected:', videoId);
        setCurrentVideoId(videoId);
        
        // Clear previous transcript
        clearTranscript();
        
        // Get transcript for new video with delay to ensure page is loaded
        setTimeout(() => {
          getYouTubeTranscript();
        }, 1500);
      }
    } 
  };

  const generateSummary = async () => {
    if (!transcript.length) return;
    console.log('Generating summary for transcript:', transcript);

    const fullTranscriptText = transcript
      .map(item => item.text.replace(/\n/g, ' ').trim())
      .join(' ');

    youTubeChatHook.addUserMessage("summary");
  
    // If transcript is very long, chunk it
    const maxLength = 10000;
    
    if (fullTranscriptText.length > maxLength) {
      const chunks = [];
      for (let i = 0; i < fullTranscriptText.length; i += maxLength) {
        chunks.push(fullTranscriptText.slice(i, i + maxLength));
      }
      
      const summaryPrompt = `Please provide a concise summary of this video transcript (presented in chunks):\n\nChunk 1/${chunks.length}:\n${chunks[0]}`;
      console.log('Summary prompt:', summaryPrompt);
      youTubeChatHook.sendMessage(summaryPrompt); // Use the YouTube chat hook
    } else {
      const summaryPrompt = `Please provide a concise summary of this video transcript:\n\n${fullTranscriptText}`;
      youTubeChatHook.sendMessage(summaryPrompt); // Use the YouTube chat hook
    }
  };

  // Download transcript function
  const downloadTranscript = () => {
    if (!transcript.length) {
      console.log('No transcript available to download');
      return;
    }

    try {
      // Get video title from page
      const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() 
        || document.querySelector('#title h1')?.textContent?.trim()
        || `YouTube_Video_${currentVideoId}`;

      // Create transcript content in different formats
      const createTextFormat = () => {
        return transcript.map(item => `[${item.time}] ${item.text}`).join('\n\n');
      };

      const createSRTFormat = () => {
        return transcript.map((item, index) => {
          const startTime = item.time;
          const nextItem = transcript[index + 1];
          const endTime = nextItem ? nextItem.time : item.time;
          
          // Convert time format for SRT (HH:MM:SS,mmm)
          const formatSRTTime = (timeStr) => {
            const parts = timeStr.split(':');
            if (parts.length === 2) {
              return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')},000`;
            }
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')},000`;
          };

          return `${index + 1}\n${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n${item.text}\n`;
        }).join('\n');
      };

      const createJSONFormat = () => {
        const metadata = {
          videoId: currentVideoId,
          title: videoTitle,
          downloadDate: new Date().toISOString(),
          totalSegments: transcript.length
        };
        return JSON.stringify({ metadata, transcript }, null, 2);
      };

      // Create download options
      const formats = [
        { name: 'Text (.txt)', content: createTextFormat(), extension: 'txt', mimeType: 'text/plain' },
        { name: 'SRT Subtitles (.srt)', content: createSRTFormat(), extension: 'srt', mimeType: 'text/plain' },
        { name: 'JSON (.json)', content: createJSONFormat(), extension: 'json', mimeType: 'application/json' }
      ];

      // For now, default to text format. You could add a format selector later.
      const selectedFormat = formats[0]; // Text format

      // Create and download file
      const blob = new Blob([selectedFormat.content], { type: selectedFormat.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_transcript.${selectedFormat.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`Downloaded transcript as ${selectedFormat.extension.toUpperCase()}`);
      
      // Show success message in chat
      youTubeChatHook.addMessage({
        type: 'system',
        content: `✅ Transcript downloaded as ${selectedFormat.name}`
      });

    } catch (error) {
      console.error('Error downloading transcript:', error);
      youTubeChatHook.addMessage({
        type: 'system',
        content: `❌ Error downloading transcript: ${error.message}`
      });
    }
  };

  // Define custom actions for YouTube
  const youtubeActions = [
    {
      id: 'resume-video',
      label: 'Resume',
      icon: '▶️',
      onClick: youTubeChatHook.handleResumeVideo, // Use hook's function
      isVisible: () => youTubeChatHook.showResumeButton, // Use hook's state
      className: 'resume-video-action',
      title: 'Resume the paused YouTube video'
    },
    {
      id: 'generate-summary',
      label: 'Summary',
      icon: '📋',
      onClick: generateSummary,
      isVisible: () => transcript.length > 0 && !isLoadingTranscript,
      className: 'summary-action',
      title: 'Generate a summary of the entire video'
    },
    {
      id: 'download-transcript',
      label: 'Transcript',
      icon: '💾',
      onClick: downloadTranscript,
      isVisible: () => transcript.length > 0 && !isLoadingTranscript,
      className: 'download-action',
      title: 'Download transcript as text file'
    }
  ];

  return (
    <ContentApp 
      useCustomChat={() => youTubeChatHook} // Pass as function
      customActions={youtubeActions}
      onUrlChange={handleUrlChange}
    />
  );
};

export default YouTubeContentApp;