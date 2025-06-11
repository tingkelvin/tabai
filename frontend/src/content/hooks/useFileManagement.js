// hooks/useFileManagement.js
import { useRef } from 'react';
import { useFileContext } from '../contexts/FileProvider';

export const useFileManagement = (addUserMessage) => {
  const fileInputRef = useRef(null);
  const fileContext = useFileContext();

  // Create wrapped versions of functions that include addUserMessage
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await fileContext.handleFileUpload(file, addUserMessage);
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      event.target.value = '';
    }
  };

  const removeFile = async (fileToRemove) => {
    await fileContext.removeFile(fileToRemove, addUserMessage);
  };

  // Return all the context values plus the wrapped functions
  return {
    ...fileContext,
    handleFileUpload,
    removeFile,
    fileInputRef
  };
};