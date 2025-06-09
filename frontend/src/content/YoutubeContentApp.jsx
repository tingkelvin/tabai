// YouTubeContentApp.jsx - Simplified version with extracted utils
import React, { useState, useEffect, useCallback } from 'react';
import ContentApp from './ContentApp';
import { useYoutubeTranscript } from './hooks/useYoutubeTranscript';
import { useYoutubeChat } from './hooks/useYoutubeChat';
import { useYoutubeUrlTracking } from './hooks/useYoutubeUrlTracking';
import { downloadTranscriptFile } from './utils/transcriptHelpers';
import { PlayIconFilled, DownloadIconAlt, SummaryIcon} from './components/Icons';

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
      console.log('Loading transcript for video:', videoId);
      setCurrentVideoId(videoId);
      clearTranscript();
      
      setTimeout(() => {
        getYoutubeTranscript();
      }, 1500);
    }
  }, [videoId]);

  const generateSummary = useCallback(async () => {
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
      youTubeChatHook.sendMessage(`${chunks[0]}`, 'summary', {
        useFileContents: false
      })
    } else {
      youTubeChatHook.sendMessage(`${fullTranscriptText}`, 'summary', {
        useFileContents: false
      })
    }
  }, [transcript, youTubeChatHook]);

  // Simplified download function using utility
  const downloadTranscript = useCallback(() => {
    youTubeChatHook.addUserMessage("download transcript");
    if (!transcript.length) {
      console.log('No transcript available to download');
      youTubeChatHook.addAssistantMessage('❌ No transcript available to download')
      return;
    }

    try {
      const result = downloadTranscriptFile(transcript, videoId);
      youTubeChatHook.addAssistantMessage(`✅ Transcript downloaded as ${result.format.name}`)
    } catch (error) {
      console.error('Error downloading transcript:', error);
      youTubeChatHook.addAssistantMessage(`❌ Error downloading transcript: ${error.message}`)
    }
  }, [transcript, videoId, youTubeChatHook]);

  // Define custom actions for YouTube
  const youtubeActions = [
    {
      id: 'resume-video',
      label: 'Resume',
      icon: <PlayIconFilled />,
      onClick: youTubeChatHook.handleResumeVideo,
      isVisible: () => youTubeChatHook.showResumeButton,
      className: 'resume-video-action',
      title: 'Resume the paused YouTube video'
    },
    {
      id: 'generate-summary',
      label: 'Summary',
      icon: <SummaryIcon />,
      onClick: generateSummary,
      isVisible: () => transcript.length > 0 && !isLoadingTranscript,
      className: 'summary-action',
      title: 'Generate a summary of the entire video'
    },
    {
      id: 'download-transcript',
      label: 'Transcript',
      icon: <DownloadIconAlt />,
      onClick: downloadTranscript,
      isVisible: () => transcript.length > 0 && !isLoadingTranscript,
      className: 'download-action',
      title: 'Download transcript as text file'
    }
  ];

  return (
    <ContentApp 
      customChatHook={youTubeChatHook}
      customActions={youtubeActions}
      title={`${videoTitle || 'YouTube'}`}
    />
  );
};

export default YoutubeContentApp;