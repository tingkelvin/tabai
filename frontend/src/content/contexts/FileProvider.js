// contexts/FileProvider.js - Consolidated
import React, { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect } from 'react';

const FileContext = createContext(null);

const SUPPORTED_FILE_TYPES = {
    'text/plain': ['.txt', '.md', '.log'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    // 'text/javascript': ['.js', '.jsx'],
    // 'text/html': ['.html', '.htm'],
    // 'text/css': ['.css'],
    // 'application/xml': ['.xml'],
    // 'text/xml': ['.xml'],
    // 'application/yaml': ['.yml', '.yaml'],
    'text/markdown': ['.md'],
    // Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    'image/bmp': ['.bmp'],
    'image/tiff': ['.tiff', '.tif']
};

const STORAGE_KEY = 'session_uploaded_files';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4MB
const MAX_FILES = 5;

export const useFileContext = () => {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error('useFileContext must be used within a FileProvider');
    }
    return context;
};

// FileStorage class with arrow functions
const FileStorage = () => {
    const validateFile = (file) => {
        if (file.size > MAX_SIZE) {
            throw new Error(`File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Max: 2MB`);
        }

        // Check if file type is supported
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const isSupported = Object.entries(SUPPORTED_FILE_TYPES).some(([mimeType, extensions]) => {
            return file.type === mimeType || extensions.includes(fileExtension);
        });

        if (!isSupported) {
            throw new Error(`Unsupported file type. Supported: ${Object.values(SUPPORTED_FILE_TYPES).flat().join(', ')}`);
        }

        const currentFiles = loadFiles();

        if (currentFiles.length >= MAX_FILES) {
            throw new Error(`Maximum ${MAX_FILES} files allowed. Remove files first.`);
        }

        const totalSize = currentFiles.reduce((sum, f) => sum + f.size, 0);
        if (totalSize + file.size > MAX_TOTAL_SIZE) {
            throw new Error('Session storage full. Close and reopen tab to reset.');
        }
    };

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
                        uploadDate: new Date().toISOString()
                    };

                    const existingFiles = loadFiles();
                    existingFiles.push(fileData);
                    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existingFiles));
                    resolve(fileData);
                } catch (error) {
                    reject(new Error('Session storage quota exceeded. Try smaller files.'));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const loadFiles = () => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            sessionStorage.removeItem(STORAGE_KEY);
            return [];
        }
    };

    const deleteFile = (fileId) => {
        try {
            const files = loadFiles();
            const filteredFiles = files.filter(f => f.id !== fileId);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFiles));
            return true;
        } catch (error) {
            return false;
        }
    };

    const getFileObject = (storedFile) => {
        try {
            const [header, base64Data] = storedFile.content.split(',');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const file = new File([bytes], storedFile.name, {
                type: storedFile.type,
                lastModified: storedFile.lastModified
            });

            file.id = storedFile.id;
            return file;
        } catch (error) {
            return null;
        }
    };

    return {
        validateFile,
        saveFile,
        loadFiles,
        deleteFile,
        getFileObject
    };
};

export const FileProvider = ({ children }) => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileContentsRef = useRef(new Map());
    const fileStorage = useMemo(() => FileStorage(), []);

    useEffect(() => {
        return () => fileContentsRef.current.clear();
    }, []);

    const formatFileName = (fileName) => {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return fileName;

        const name = fileName.substring(0, lastDotIndex);
        const extension = fileName.substring(lastDotIndex);

        return name.length > 5 ? `${name.substring(0, 5)}...${extension}` : fileName;
    };

    const readFileContent = useCallback(async (file) => {
        try {
            const cacheKey = `${file.name}-${file.lastModified}-${file.size}`;
            if (fileContentsRef.current.has(cacheKey)) {
                return fileContentsRef.current.get(cacheKey);
            }

            const content = file.text ? await file.text() : await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });

            // Cache management
            if (fileContentsRef.current.size >= 10) {
                const firstKey = fileContentsRef.current.keys().next().value;
                fileContentsRef.current.delete(firstKey);
            }

            fileContentsRef.current.set(cacheKey, content);
            return content;
        } catch (error) {
            throw new Error(`Failed to read ${file.name}: ${error.message}`);
        }
    }, []);

    const loadSessionFiles = useCallback(() => {
        try {
            const sessionFiles = fileStorage.loadFiles();
            if (sessionFiles.length > 0) {
                const fileObjects = sessionFiles
                    .map(sf => fileStorage.getFileObject(sf))
                    .filter(f => f !== null);
                setUploadedFiles(fileObjects);
            }
        } catch (error) {
            console.error('Error loading session files:', error);
        }
    }, [fileStorage]);

    const handleFileUpload = useCallback(async (file, addUserMessage) => {
        if (!file || isUploading) return;

        // Check for existing file
        const existingFile = uploadedFiles.find(f =>
            f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
        );

        if (existingFile) {
            addUserMessage?.(`📄 File "${file.name}" is already uploaded`);
            return;
        }

        setIsUploading(true);

        try {
            await fileStorage.saveFile(file);
            setUploadedFiles(prev => [...prev, file]);
            addUserMessage?.(`✅ File "${file.name}" uploaded successfully`);
        } catch (error) {
            console.error('File upload error:', error);
            addUserMessage?.(`❌ Failed to upload "${file.name}": ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    }, [uploadedFiles, isUploading, fileStorage]);

    const removeFile = useCallback(async (fileToRemove, addUserMessage) => {
        try {
            const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
            const fileExists = uploadedFiles.find(f => f.name === fileName);

            if (!fileExists) return;

            // Delete from storage
            if (fileExists.id) {
                fileStorage.deleteFile(fileExists.id);
            }

            // Update state
            setUploadedFiles(prev => prev.filter(f => f.name !== fileName));

            // Clear cache
            const cacheKeys = Array.from(fileContentsRef.current.keys());
            cacheKeys.filter(key => key.startsWith(fileName))
                .forEach(key => fileContentsRef.current.delete(key));

            addUserMessage?.(`🗑️ File "${fileName}" removed`);
        } catch (error) {
            const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
            addUserMessage?.(`❌ Failed to remove "${fileName}": ${error.message}`);
        }
    }, [uploadedFiles, fileStorage]);

    const getAllContentAsString = useCallback(async () => {
        if (uploadedFiles.length === 0) return '';

        try {
            const contentPromises = uploadedFiles.map(async (file) => {
                try {
                    const content = await readFileContent(file);
                    return `File: ${file.name}\n${content}`;
                } catch (error) {
                    return `[Error reading ${file.name}: ${error.message}]`;
                }
            });

            const allContents = await Promise.all(contentPromises);
            return allContents.join('\n\n---\n\n');
        } catch (error) {
            throw new Error(`Failed to get all content: ${error.message}`);
        }
    }, [uploadedFiles, readFileContent]);

    const displayFileContent = useCallback(async (file) => {
        try {
            const content = await readFileContent(file);
            return content.length > 200 ? content.substring(0, 200) + '...' : content;
        } catch (error) {
            return `[Error loading ${file.name}: ${error.message}]`;
        }
    }, [readFileContent]);

    const value = {
        uploadedFiles,
        formatFileName,
        handleFileUpload,
        loadSessionFiles,
        displayFileContent,
        getAllContentAsString,
        removeFile,
        cleanup: () => fileContentsRef.current.clear(),
        isUploading,
        readFileContent
    };

    return (
        <FileContext.Provider value={value}>
            {children}
        </FileContext.Provider>
    );
};