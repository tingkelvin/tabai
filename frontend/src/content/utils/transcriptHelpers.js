export const isRealSpeech = (text) => {
    if (!text || text.length === 0) return false;
    
    // Common patterns to filter out
    const nonSpeechPatterns = [
      /^\[.*\]$/,                    // [upbeat music], [applause], [laughter]
      /^\(.*\)$/,                    // (music), (applause)
      /^♪.*♪$/,                      // ♪ music notes ♪
      /^music$/i,                    // just "music"
      /^applause$/i,                 // just "applause"
      /^laughter$/i,                 // just "laughter"
      /^\[music\]$/i,               // [music]
      /^\[applause\]$/i,            // [applause]  
      /^\[laughter\]$/i,            // [laughter]
      /^\[cheering\]$/i,            // [cheering]
      /^\[silence\]$/i,             // [silence]
      /^\[inaudible\]$/i,           // [inaudible]
      /^\[foreign language\]$/i,    // [foreign language]
      /^\[♪.*♪\]$/,                 // [♪ music ♪]
      /^--$/,                       // just dashes
      /^\.\.\.$/,                   // just dots
      /^\*.*\*$/,                   // *sound effects*
    ];
    
    // Check if text matches any non-speech pattern
    return !nonSpeechPatterns.some(pattern => pattern.test(text.trim()));
  };
  
  // O(log n) version using binary search
  export const getTranscriptRangeBinary = (startSeconds, endSeconds, parsedTranscript) => {
    if (!parsedTranscript.length) return [];
    
    // Find start index - O(log n)
    const startIndex = binarySearchStart(parsedTranscript, startSeconds);
    
    // Find end index - O(log n) 
    const endIndex = binarySearchEnd(parsedTranscript, endSeconds);
    
    // Slice, clean, and filter text - O(k) where k = result size
    return parsedTranscript.slice(startIndex, endIndex + 1)
      .map(item => item.text.replace(/\n/g, ' ').trim())
  };
  
  const binarySearchStart = (arr, target) => {
    let left = 0, right = arr.length - 1;
    let result = 0;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid].timeInSeconds >= target) {
        result = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    return result;
  };
  
  const binarySearchEnd = (arr, target) => {
    let left = 0, right = arr.length - 1;
    let result = arr.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid].timeInSeconds <= target) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return result;
  };

  export const downloadTranscriptFile = (transcript, videoId) => {
    // Get video title from page
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() 
      || document.querySelector('#title h1')?.textContent?.trim()
      || `YouTube_Video_${videoId}`;
  
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
        videoId: videoId,
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
    
    return {
      format: selectedFormat,
      filename: `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_transcript.${selectedFormat.extension}`
    };
  };