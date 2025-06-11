import React, { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import SessionFileStorage from '../services/SessionFileStorage';
import { readAndSerializeFile, validateFile } from '../utils/fileUtils';

// Create the context
const FileContext = createContext(null);

// Custom hook to use the file context
export const useFileContext = () => {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error('useFileContext must be used within a FileProvider');
    }
    return context;
};

// FileProvider component
export const FileProvider = ({ children }) => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const fileContentsRef = useRef(new Map());
    const sessionFileStorage = useMemo(() => SessionFileStorage(), []);

    // Cleanup effect
    useEffect(() => {
        console.log('🚀 FileProvider mounted');
        return () => {
            fileContentsRef.current.clear();
        };
    }, []);

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

    const readFileContent = useCallback(async (file) => {
        try {
            const cacheKey = `${file.name}-${file.lastModified}-${file.size}`;
            if (fileContentsRef.current.has(cacheKey)) {
                return fileContentsRef.current.get(cacheKey);
            }

            let content;
            if (file.text && typeof file.text === 'function') {
                content = await file.text();
            } else {
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
                        reject(new Error(`FileReader error: ${error.target?.error?.message || 'Unknown error'}`));
                    };

                    reader.onabort = () => {
                        cleanup();
                        reject(new Error('File reading aborted'));
                    };

                    reader.readAsText(file);
                });
            }

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
    }, []);

    const getAllContentAsString = useCallback(async () => {
        if (uploadedFiles.length === 0) {
            return '';
        }

        try {
            const contentPromises = uploadedFiles.map(async (file) => {
                try {
                    const content = await readFileContent(file);
                    return `File: ${file.name}\n${content}`;
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
    }, [uploadedFiles, readFileContent]);

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

    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = useCallback(async (file, addUserMessage) => {
        if (!file || isUploading) return;

        const existingFile = uploadedFiles.find(f =>
            f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
        );

        if (existingFile) {
            if (addUserMessage) {
                addUserMessage(`📄 File "${file.name}" is already uploaded`);
            }
            return;
        }

        setIsUploading(true);

        try {
            validateFile(file);
            const savedFile = await sessionFileStorage.saveFile(file);
            setUploadedFiles(prev => [...prev, file]);

            if (addUserMessage) {
                addUserMessage(`✅ File "${file.name}" uploaded successfully`);
            }

        } catch (error) {
            console.error('File upload error:', error);
            if (addUserMessage) {
                addUserMessage(`❌ Failed to upload "${file.name}": ${error.message}`);
            }
        } finally {
            setIsUploading(false);
        }
    }, [uploadedFiles, isUploading, sessionFileStorage]);

    const displayFileContent = useCallback(async (file) => {
        try {
            const content = await readFileContent(file);
            const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
            return preview;
        } catch (error) {
            console.error('Error displaying file content:', error);
            return `[Error loading ${file.name}: ${error.message}]`;
        }
    }, [readFileContent]);

    const removeFile = useCallback(async (fileToRemove, addUserMessage) => {
        try {
            const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;

            const fileExists = uploadedFiles.find(f => f.name === fileName);

            if (!fileExists) {
                console.warn(`File "${fileName}" not found for removal`);
                return;
            }

            if (fileExists.id) {
                sessionFileStorage.deleteFile(fileExists.id);
            } else {
                const sessionFiles = sessionFileStorage.loadFiles();
                const sessionFile = sessionFiles.find(sf => sf.name === fileName);
                if (sessionFile?.id) {
                    sessionFileStorage.deleteFile(sessionFile.id);
                }
            }

            setUploadedFiles(prev => prev.filter(f => f.name !== fileName));

            const cacheKeys = Array.from(fileContentsRef.current.keys());
            const keysToRemove = cacheKeys.filter(key => key.startsWith(fileName));
            keysToRemove.forEach(key => fileContentsRef.current.delete(key));

            if (addUserMessage) {
                addUserMessage(`🗑️ File "${fileName}" removed`);
            }

        } catch (error) {
            console.error('Error removing file:', error);
            const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
            if (addUserMessage) {
                addUserMessage(`❌ Failed to remove "${fileName}": ${error.message}`);
            }
        }
    }, [uploadedFiles, sessionFileStorage]);

    const cleanup = useCallback(() => {
        fileContentsRef.current.clear();
    }, []);

    const value = {
        uploadedFiles,
        formatFileName,
        handleFileUpload,
        loadSessionFiles,
        displayFileContent,
        getAllContentAsString,
        removeFile,
        cleanup,
        isUploading,
        readFileContent
    };

    return (
        <FileContext.Provider value={value}>
            {children}
        </FileContext.Provider>
    );
};