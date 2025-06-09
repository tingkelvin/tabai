const SessionFileStorage = () => {
  const STORAGE_KEY = 'session_uploaded_files';
  const MAX_SIZE = 4 * 1024 * 1024; // 4MB limit
  const MAX_TOTAL_SIZE = MAX_SIZE * 2; // 8MB total

  const validateFile = (file) => {
    if (file.size > MAX_SIZE) {
      throw new Error(`File too large: ${getFileSize(file.size)}. Max: ${getFileSize(MAX_SIZE)}`);
    }
    
    const currentFiles = loadFiles();
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
      
      reader.onload = () => {
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
          existingFiles.push(fileData);
          
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existingFiles));
          console.log(`📝 File saved to session: ${file.name} (will be lost on tab close)`);
          resolve(fileData);
          
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            reject(new Error('Session storage quota exceeded. Try smaller files or close/reopen tab.'));
          } else {
            reject(error);
          }
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
  
  const loadFiles = () => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading session files:', error);
      return [];
    }
  }
  
  const deleteFile = (fileId) => {
    try {
      const files = loadFiles();
      const filteredFiles = files.filter(f => f.id !== fileId);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFiles));
      console.log(`🗑️ File deleted from session: ${fileId}`);
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
      totalSize: totalSize,
      totalSizeFormatted: getFileSize(totalSize),
      sessionId: getSessionId(),
      storageUsed: getStorageUsage(),
      maxSize: MAX_SIZE,
      maxSizeFormatted: getFileSize(MAX_SIZE)
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
      const base64Data = storedFile.content.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new File([byteArray], storedFile.name, {
        type: storedFile.type,
        lastModified: storedFile.lastModified
      });
    } catch (error) {
      console.error('Error converting to File object:', error);
      return null;
    }
  }
  
  const isNewSession = () => {
    return loadFiles().length === 0;
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
    isNewSession
  };
}

export default SessionFileStorage;