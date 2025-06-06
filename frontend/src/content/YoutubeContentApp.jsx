// YouTubeContentApp.jsx - Simplified version with extracted utils
import React, { useState, useEffect, useCallback } from 'react';
import ContentApp from './ContentApp';
import { useYoutubeTranscript } from './hooks/useYoutubeTranscript';
import { useYoutubeChat } from './hooks/useYoutubeChat';
import { useYoutubeUrlTracking } from './hooks/useYoutubeUrlTracking';
import { downloadTranscriptFile } from './utils/transcriptHelpers';

const YoutubeContentApp = () => {
  const [currentVideoId, setCurrentVideoId] = useState(null);

  // Use the simplified YouTube URL tracking
  const {
    currentUrl,
    videoId,
    videoTitle,
    isYouTubePage,
    formattedTitle
  } = useYoutubeUrlTracking();

  // Use the transcript hook
  const { 
    transcript, 
    isLoadingTranscript, 
    getYoutubeTranscript,
    clearTranscript 
  } = useYoutubeTranscript();

  // Use the YouTube chat hook with transcript
  const youTubeChatHook = useYoutubeChat(transcript);

  // Handle video changes - load transcript when videoId changes
  useEffect(() => {
    if (videoId && videoId !== currentVideoId) {
      //console.log('Loading transcript for video:', videoId);
      setCurrentVideoId(videoId);
      clearTranscript();
      
      setTimeout(() => {
        getYoutubeTranscript();
      }, 1500);
    }
  }, [videoId]);

  const generateSummary = useCallback(async () => {
    if (!transcript.length) return;
    //console.log('Generating summary for transcript:', transcript);

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
      //console.log('Summary prompt:', summaryPrompt);
      youTubeChatHook.sendMessage(summaryPrompt);
    } else {
      const summaryPrompt = `Please provide a concise summary of this video transcript:\n\n${fullTranscriptText}`;
      youTubeChatHook.sendMessage(summaryPrompt);
    }
  }, [transcript, youTubeChatHook]);

  // Simplified download function using utility
  const downloadTranscript = useCallback(() => {
    youTubeChatHook.addUserMessage("download transcript");
    if (!transcript.length) {
      //console.log('No transcript available to download');
      youTubeChatHook.addMessage({
        type: 'system',
        content: '❌ No transcript available to download'
      });
      return;
    }

    try {
      const result = downloadTranscriptFile(transcript, videoId);
      
      // Show success message in chat
      youTubeChatHook.addMessage({
        type: 'system',
        content: `✅ Transcript downloaded as ${result.format.name}`
      });

    } catch (error) {
      console.error('Error downloading transcript:', error);
      youTubeChatHook.addMessage({
        type: 'system',
        content: `❌ Error downloading transcript: ${error.message}`
      });
    }
  }, [transcript, videoId, youTubeChatHook]);

  // Define custom actions for YouTube
  const youtubeActions = [
    {
      id: 'resume-video',
      label: 'Resume',
      icon: '▶️',
      onClick: youTubeChatHook.handleResumeVideo,
      isVisible: () => youTubeChatHook.showResumeButton,
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
      useCustomChat={() => youTubeChatHook}
      customActions={youtubeActions}
      title={`${videoTitle || 'YouTube'}`}
    />
  );
};

export default YoutubeContentApp;