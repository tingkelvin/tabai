import { WIDGET_CONFIG } from './constants';

export const calculateInitialPositions = () => {
  const widgetPosition = {
    top: WIDGET_CONFIG.MARGINS.DEFAULT,
    left: window.innerWidth - WIDGET_CONFIG.DEFAULT_WIDTH - WIDGET_CONFIG.MARGINS.DEFAULT
  };

  const iconPosition = {
    top: WIDGET_CONFIG.MARGINS.DEFAULT,
    left: window.innerWidth - WIDGET_CONFIG.ICON_SIZE - WIDGET_CONFIG.MARGINS.DEFAULT
  };

  return { widgetPosition, iconPosition };
};

// Helper function to convert time string (e.g., "1:23") to seconds
export const parseTimeToSeconds = (timeString) => {
  if (!timeString) return 0;
  
  const parts = timeString.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
};

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