import { useState, useRef, useCallback } from 'react';
import SessionFileStorage from '../services/SessionFileStorage';
import { readAndSerializeFile, validateFile } from '../utils/fileUtils';

export const useFileManagement = (addUserMessage) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  // Remove fileContents cache to prevent memory leaks
  const fileContentsRef = useRef(new Map()); // Use Map for better memory management
  
  // Initialize the storage instance
  const sessionFileStorage = SessionFileStorage();

  const formatFileName = (fileName) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName;
    
    const name = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    
    if (name.length > 5) {
      return `${name.substring(0, 5)}...${extension}`;
    }
    return fileName;
  };

  // Optimized file reading with proper cleanup - define this first
  const readFileContent = useCallback(async (file) => {
    try {
      // Check cache first
      const cacheKey = `${file.name}-${file.lastModified}-${file.size}`;
      if (fileContentsRef.current.has(cacheKey)) {
        return fileContentsRef.current.get(cacheKey);
      }

      let content;
      
      // Use modern File.text() if available, fallback to FileReader
      if (file.text && typeof file.text === 'function') {
        content = await file.text();
      } else {
        // Properly managed FileReader
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          const cleanup = () => {
            reader.onload = null;
            reader.onerror = null;
            reader.onabort = null;
          };
          
          reader.onload = (event) => {
            cleanup();
            resolve(event.target.result);
          };
          
          reader.onerror = (error) => {
            cleanup();
            reject(error);
          };
          
          reader.onabort = () => {
            cleanup();
            reject(new Error('File reading aborted'));
          };
          
          reader.readAsText(file);
        });
      }

      // Cache with size limit (keep max 10 files in memory)
      if (fileContentsRef.current.size >= 10) {
        const firstKey = fileContentsRef.current.keys().next().value;
        fileContentsRef.current.delete(firstKey);
      }
      
      fileContentsRef.current.set(cacheKey, content);
      return content;
    } catch (error) {
      console.error('Error reading file content:', error);
      throw new Error(`Failed to read ${file.name}: ${error.message}`);
    }
  }, []); // No dependencies needed as it only uses refs

  // Optimized function to get all content as a single string
  const getAllContentAsString = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      return '';
    }
    
    try {
      const contentPromises = uploadedFiles.map(async (file) => {
        try {
          const content = await readFileContent(file);
          return content;
        } catch (error) {
          console.error(`Error reading ${file.name}:`, error);
          return `[Error reading ${file.name}: ${error.message}]`;
        }
      });

      const allContents = await Promise.all(contentPromises);
      return allContents.join('\n\n---\n\n');

    } catch (error) {
      console.error('Error getting all content:', error);
      throw new Error(`Failed to get all content: ${error.message}`);
    }
  }, [uploadedFiles, readFileContent]); // readFileContent is stable now, so this is safe

  // Optimized file loading
  const loadSessionFiles = useCallback(() => {
    try {
      const sessionFiles = sessionFileStorage.loadFiles();
      
      if (sessionFiles.length > 0) {
        const fileObjects = sessionFiles
          .map(sf => sessionFileStorage.getFileObject(sf))
          .filter(f => f !== null);
        setUploadedFiles(fileObjects);
      } 
    } catch (error) {
      console.error('Error loading session files:', error);
    }
  }, [sessionFileStorage]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file already uploaded
    const existingFile = uploadedFiles.find(f => 
      f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
    );
    
    if (existingFile) {
      event.target.value = '';
      return;
    }

    try {
      // Validate file before processing
      validateFile(file);
      
      // Save to session storage (this already handles the file reading)
      const savedFile = await sessionFileStorage.saveFile(file);
      
      // Only store the file object, not duplicate content
      setUploadedFiles(prev => [...prev, file]);
      
    } catch (error) {
      console.error('File upload error:', error);
    }
    
    // Clear input to prevent memory retention
    event.target.value = '';
  };

  const displayFileContent = async (file) => {
    try {
      const content = await readFileContent(file);
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
      
    } catch (error) {
    }
  };

  const removeFile = async (fileToRemove) => {
    try {
      const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
      
      const fileExists = uploadedFiles.find(f => f.name === fileName);
      
      if (!fileExists) {
        return;
      }

      // Remove from session storage
      if (fileExists.id) {
        sessionFileStorage.deleteFile(fileExists.id);
      } else {
        const sessionFiles = sessionFileStorage.loadFiles();
        const sessionFile = sessionFiles.find(sf => sf.name === fileName);
        if (sessionFile?.id) {
          sessionFileStorage.deleteFile(sessionFile.id);
        }
      }
      
      // Remove from uploadedFiles state
      setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
      
      // Clear from cache using proper key
      const cacheKeys = Array.from(fileContentsRef.current.keys());
      const keysToRemove = cacheKeys.filter(key => key.startsWith(fileName));
      keysToRemove.forEach(key => fileContentsRef.current.delete(key));
      
    } catch (error) {
      console.error('Error removing file:', error);
      const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
    }
  };

  // Cleanup function for unmounting
  const cleanup = () => {
    fileContentsRef.current.clear();
  };

  return {
    uploadedFiles,
    formatFileName,
    handleFileUpload,
    loadSessionFiles,
    displayFileContent,
    getAllContentAsString,
    removeFile,
    cleanup // Export cleanup for component unmounting
  };
};