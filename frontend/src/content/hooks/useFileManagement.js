import { useState, useRef } from 'react';
import SessionFileStorage from '../services/SessionFileStorage';
import { readAndSerializeFile, validateFile } from '../utils/fileUtils';

export const useFileManagement = (addUserMessage) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileContents, setFileContents] = useState({});
  
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

    // New function to get all content as a single string
    const getAllContentAsString = async () => {
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
              return includeFileNames 
                ? `${fileNameFormat.replace('{fileName}', file.name)}\n[Error reading file: ${error.message}]`
                : `[Error reading ${file.name}: ${error.message}]`;
            }
          });
    
          const allContents = await Promise.all(contentPromises);
          return allContents.join('\n\n---\n\n');
    
        } catch (error) {
          console.error('Error getting all content:', error);
          throw new Error(`Failed to get all content: ${error.message}`);
        }
    };
    

  // Simple async function - no useCallback needed
  const readFileContent = async (file) => {
    try {
      // Check if we already have the content cached
      if (fileContents[file.name]) {
        return fileContents[file.name];
      }

      let content;
      
      // Use modern File.text() if available, fallback to FileReader
      if (file.text && typeof file.text === 'function') {
        content = await file.text();
      } else {
        // Fallback to FileReader
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      // Cache the content
      setFileContents(prev => ({
        ...prev,
        [file.name]: content
      }));

      return content;
    } catch (error) {
      console.error('Error reading file content:', error);
      throw new Error(`Failed to read ${file.name}: ${error.message}`);
    }
  };

  // Event handler - no useCallback needed
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file already uploaded
    const existingFile = uploadedFiles.find(f => f.name === file.name);
    if (existingFile) {
        addUserMessage(`⚠️ File "${file.name}" is already uploaded`);
        event.target.value = '';
        return;
    }
  
    try {
      // Validate file before processing
      validateFile(file);
      
      // Read and serialize file content safely
      const serializedFile = await readAndSerializeFile(file);
      
      // Save to session storage
      const savedFile = await sessionFileStorage.saveFile(file);
      setUploadedFiles(prev => [...prev, file]);
      // You can now safely use serializedFile.content as a string
      console.log('File content preview:', serializedFile.content.substring(0, 200) + '...');
      
      // Store serialized content if needed
      // await sessionFileStorage.saveSerializedContent(serializedFile);
      
    } catch (error) {
      console.error('File upload error:', error);
      addUserMessage(`❌ Upload failed: ${error.message}`);
    }
    
    // Clear input
    event.target.value = '';
  };

  // Simple function - no useCallback needed
  const loadSessionFiles = () => {
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
  };

  const displayFileContent = async (file) => {
    try {
      const content = await readFileContent(file);
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
      
      addUserMessage(
        `\`\`\`\n${file.name}:\n${preview}\n\`\`\``
      );
    } catch (error) {
      addUserMessage(`❌ Failed to read ${file.name}: ${error.message}`);
    }
  };

  const removeFile = async (fileToRemove) => {
    try {
      // Handle both file object and file name string
      const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
      
      // Find the file in uploadedFiles array
      const fileExists = uploadedFiles.find(f => f.name === fileName);
      
      if (!fileExists) {
        addUserMessage(`⚠️ File "${fileName}" not found`);
        return;
      }
  
      // Remove from session storage - need to get the file ID
      // If your files have IDs, use that, otherwise we need to find by name
      if (fileExists.id) {
        sessionFileStorage.deleteFile(fileExists.id);
      } else {
        // Fallback: find file in session storage by name and delete
        const sessionFiles = sessionFileStorage.loadFiles();
        const sessionFile = sessionFiles.find(sf => sf.name === fileName);
        if (sessionFile && sessionFile.id) {
          sessionFileStorage.deleteFile(sessionFile.id);
        }
      }
      
      // Remove from uploadedFiles state
      setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
      
      // Remove from fileContents cache
      setFileContents(prev => {
        const updated = { ...prev };
        delete updated[fileName];
        return updated;
      });
      
      addUserMessage(`✅ Removed "${fileName}"`);
      
    } catch (error) {
      console.error('Error removing file:', error);
      const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
      addUserMessage(`❌ Failed to remove "${fileName}": ${error.message}`);
    }
  };
  

  return {
    uploadedFiles,
    formatFileName,
    handleFileUpload,
    loadSessionFiles,
    displayFileContent,
    getAllContentAsString,
    removeFile
  };
};