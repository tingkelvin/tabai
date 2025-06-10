const SessionFileStorage = () => {
  const STORAGE_KEY = 'session_uploaded_files';
  const MAX_SIZE = 2 * 1024 * 1024; // Reduced to 2MB limit per file
  const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // Reduced to 4MB total
  const MAX_FILES = 5; // Limit number of files

  const validateFile = (file) => {
    if (file.size > MAX_SIZE) {
      throw new Error(`File too large: ${getFileSize(file.size)}. Max: ${getFileSize(MAX_SIZE)}`);
    }
    
    const currentFiles = loadFiles();
    
    // Check file count limit
    if (currentFiles.length >= MAX_FILES) {
      throw new Error(`Maximum ${MAX_FILES} files allowed. Remove files first.`);
    }
    
    const totalSize = currentFiles.reduce((sum, f) => sum + f.size, 0);
    
    if (totalSize + file.size > MAX_TOTAL_SIZE) {
      throw new Error('Session storage full. Close and reopen tab to reset.');
    }
    
    return true;
  }
  
  const getFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  const saveFile = async (file) => {
    validateFile(file);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      let timeoutId;
      
      // Add timeout to prevent hanging
      timeoutId = setTimeout(() => {
        reader.abort();
        reject(new Error('File reading timeout'));
      }, 30000); // 30 second timeout
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        reader.onload = null;
        reader.onerror = null;
        reader.onabort = null;
      };
      
      reader.onload = () => {
        cleanup();
        
        try {
          const fileData = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            content: reader.result,
            uploadDate: new Date().toISOString(),
            domain: window.location.hostname,
            sessionId: getSessionId()
          };
          
          const existingFiles = loadFiles();
          
          // Check for duplicates before adding
          const isDuplicate = existingFiles.some(f => 
            f.name === file.name && 
            f.size === file.size && 
            f.lastModified === file.lastModified
          );
          
          if (isDuplicate) {
            reject(new Error('File already exists'));
            return;
          }
          
          existingFiles.push(fileData);
          
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existingFiles));
            console.log(`📝 File saved to session: ${file.name} (${getFileSize(file.size)})`);
            resolve(fileData);
          } catch (storageError) {
            if (storageError.name === 'QuotaExceededError') {
              // Try to clean up and retry once
              cleanup();
              gc(); // Force garbage collection if available
              
              setTimeout(() => {
                try {
                  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existingFiles));
                  resolve(fileData);
                } catch (retryError) {
                  reject(new Error('Session storage quota exceeded. Try smaller files or close/reopen tab.'));
                }
              }, 100);
            } else {
              reject(storageError);
            }
          }
          
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        cleanup();
        reject(new Error('Failed to read file'));
      };
      
      reader.onabort = () => {
        cleanup();
        reject(new Error('File reading was aborted'));
      };
      
      // Use ArrayBuffer instead of DataURL for better memory efficiency
      reader.readAsDataURL(file);
    });
  }
  
  const loadFiles = () => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const files = JSON.parse(stored);
      
      // Clean up old files (older than 1 hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const validFiles = files.filter(f => {
        const uploadTime = new Date(f.uploadDate).getTime();
        return uploadTime > oneHourAgo;
      });
      
      // If we cleaned any files, update storage
      if (validFiles.length !== files.length) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validFiles));
        console.log(`🧹 Cleaned ${files.length - validFiles.length} old files`);
      }
      
      return validFiles;
    } catch (error) {
      console.error('Error loading session files:', error);
      // If storage is corrupted, clear it
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // Ignore cleanup errors
      }
      return [];
    }
  }
  
  const deleteFile = (fileId) => {
    try {
      const files = loadFiles();
      const filteredFiles = files.filter(f => f.id !== fileId);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFiles));
      console.log(`🗑️ File deleted from session: ${fileId}`);
      
      // Force garbage collection hint
      if (typeof gc === 'function') {
        setTimeout(gc, 100);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }
  
  const clearAllFiles = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      console.log('🧹 All session files cleared');
      
      // Force garbage collection hint
      if (typeof gc === 'function') {
        setTimeout(gc, 100);
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing files:', error);
      return false;
    }
  }
  
  const getSessionStats = () => {
    const files = loadFiles();
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    return {
      fileCount: files.length,
      maxFiles: MAX_FILES,
      totalSize: totalSize,
      totalSizeFormatted: getFileSize(totalSize),
      maxTotalSizeFormatted: getFileSize(MAX_TOTAL_SIZE),
      sessionId: getSessionId(),
      storageUsed: getStorageUsage(),
      maxSize: MAX_SIZE,
      maxSizeFormatted: getFileSize(MAX_SIZE),
      remainingSpace: MAX_TOTAL_SIZE - totalSize,
      remainingSpaceFormatted: getFileSize(MAX_TOTAL_SIZE - totalSize)
    };
  }
  
  const getStorageUsage = () => {
    let total = 0;
    try {
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          total += sessionStorage[key].length;
        }
      }
    } catch (error) {
      console.warn('Could not calculate storage usage:', error);
    }
    
    return total * 2; // UTF-16 encoding estimate
  }
  
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }
  
  const getFileObject = (storedFile) => {
    try {
      // More efficient base64 decoding
      const [header, base64Data] = storedFile.content.split(',');
      if (!base64Data) {
        throw new Error('Invalid file content format');
      }
      
      // Use more efficient conversion
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const file = new File([bytes], storedFile.name, {
        type: storedFile.type,
        lastModified: storedFile.lastModified
      });
      
      // Add custom properties for tracking
      file.id = storedFile.id;
      file.uploadDate = storedFile.uploadDate;
      
      return file;
    } catch (error) {
      console.error('Error converting to File object:', error);
      return null;
    }
  }
  
  const isNewSession = () => {
    return loadFiles().length === 0;
  }

  // New method to check memory pressure
  const checkMemoryPressure = () => {
    const stats = getSessionStats();
    const usage = stats.totalSize / MAX_TOTAL_SIZE;
    
    if (usage > 0.8) {
      console.warn(`⚠️ High memory usage: ${(usage * 100).toFixed(1)}%`);
      return 'high';
    } else if (usage > 0.6) {
      console.warn(`⚠️ Medium memory usage: ${(usage * 100).toFixed(1)}%`);
      return 'medium';
    }
    return 'low';
  }

  return {
    validateFile,
    getFileSize,
    saveFile,
    loadFiles,
    deleteFile,
    clearAllFiles,
    getSessionStats,
    getStorageUsage,
    getSessionId,
    getFileObject,
    isNewSession,
    checkMemoryPressure,
    MAX_SIZE,
    MAX_TOTAL_SIZE,
    MAX_FILES
  };
}

export default SessionFileStorage;