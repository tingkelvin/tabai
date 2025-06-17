
// hooks/useFileManagement.js - Simplified
import { useFileContext } from '../contexts/FileProvider';

export const useFileManagement = (addUserMessage) => {
  const context = useFileContext();

  return {
    ...context,
    // Override methods that need message handling
    handleFileUpload: (file) => context.handleFileUpload(file, addUserMessage),
    removeFile: (file) => context.removeFile(file, addUserMessage)
  };
};