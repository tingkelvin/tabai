// contexts/FileProvider.tsx - Consolidated with PDF support
import React, {
    createContext,
    useContext,
    useState,
    useRef,
    useCallback,
    useMemo,
    useEffect,
    ReactNode
} from 'react';

// Type definitions
export interface FileData {
    id: string;
    name: string;
    type: string;
    size: number;
    lastModified: number;
    content: string; // Base64 encoded content
    uploadDate: string;
}

export interface ExtendedFile extends File {
    id?: string;
}

export interface FileContextValue {
    uploadedFiles: ExtendedFile[];
    formatFileName: (fileName: string) => string;
    handleFileUpload: (file: File, addUserMessage?: (message: string) => void) => Promise<void>;
    loadSessionFiles: () => void;
    displayFileContent: (file: File) => Promise<string>;
    getAllContentAsString: () => Promise<string>;
    removeFile: (fileToRemove: string | File, addUserMessage?: (message: string) => void) => Promise<void>;
    cleanup: () => void;
    isUploading: boolean;
    readFileContent: (file: File) => Promise<string>;
}

export interface FileProviderProps {
    children: ReactNode;
}

export interface FileStorageInterface {
    validateFile: (file: File) => void;
    saveFile: (file: File) => Promise<FileData>;
    loadFiles: () => FileData[];
    deleteFile: (fileId: string) => boolean;
    getFileObject: (storedFile: FileData) => ExtendedFile | null;
}

// Global PDF.js type declaration
declare global {
    const pdfjsLib: {
        getDocument: (params: { data: ArrayBuffer }) => {
            promise: Promise<{
                numPages: number;
                getPage: (pageNum: number) => Promise<{
                    getTextContent: () => Promise<{
                        items: Array<{ str: string }>;
                    }>;
                }>;
            }>;
        };
    };
}

const FileContext = createContext<FileContextValue | null>(null);

const SUPPORTED_FILE_TYPES: Record<string, string[]> = {
    'text/plain': ['.txt', '.md', '.log'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    'text/markdown': ['.md'],
    'application/pdf': ['.pdf'], // Added PDF support
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

export const useFileContext = (): FileContextValue => {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error('useFileContext must be used within a FileProvider');
    }
    return context;
};

// PDF text extraction helper
const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `Page ${pageNum}:\n${pageText}\n\n`;
        }

        return fullText;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to extract PDF text: ${errorMessage}`);
    }
};

// FileStorage class with arrow functions
const FileStorage = (): FileStorageInterface => {
    const validateFile = (file: File): void => {
        if (file.size > MAX_SIZE) {
            throw new Error(`File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Max: 2MB`);
        }

        // Check if file type is supported
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
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

    const saveFile = async (file: File): Promise<FileData> => {
        validateFile(file);

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const fileData: FileData = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        lastModified: file.lastModified,
                        content: reader.result as string,
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

    const loadFiles = (): FileData[] => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            sessionStorage.removeItem(STORAGE_KEY);
            return [];
        }
    };

    const deleteFile = (fileId: string): boolean => {
        try {
            const files = loadFiles();
            const filteredFiles = files.filter(f => f.id !== fileId);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFiles));
            return true;
        } catch (error) {
            return false;
        }
    };

    const getFileObject = (storedFile: FileData): ExtendedFile | null => {
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
            }) as ExtendedFile;

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

export const FileProvider: React.FC<FileProviderProps> = ({ children }) => {
    const [uploadedFiles, setUploadedFiles] = useState<ExtendedFile[]>([]);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const fileContentsRef = useRef<Map<string, string>>(new Map());
    const fileStorage = useMemo(() => FileStorage(), []);

    useEffect(() => {
        return () => fileContentsRef.current.clear();
    }, []);

    const formatFileName = (fileName: string): string => {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return fileName;

        const name = fileName.substring(0, lastDotIndex);
        const extension = fileName.substring(lastDotIndex);

        return name.length > 5 ? `${name.substring(0, 5)}...${extension}` : fileName;
    };

    const readFileContent = useCallback(async (file: File): Promise<string> => {
        try {
            const cacheKey = `${file.name}-${file.lastModified}-${file.size}`;
            if (fileContentsRef.current.has(cacheKey)) {
                return fileContentsRef.current.get(cacheKey)!;
            }

            let content: string;

            // Handle PDF files
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                content = await extractTextFromPDF(file);
            } else {
                // Handle text files
                content = file.text ? await file.text() : await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsText(file);
                });
            }

            // Cache management
            if (fileContentsRef.current.size >= 10) {
                const firstKey = fileContentsRef.current.keys().next().value;
                if (firstKey) {
                    fileContentsRef.current.delete(firstKey);
                }
            }

            fileContentsRef.current.set(cacheKey, content);
            return content;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to read ${file.name}: ${errorMessage}`);
        }
    }, []);

    const loadSessionFiles = useCallback((): void => {
        try {
            const sessionFiles = fileStorage.loadFiles();
            if (sessionFiles.length > 0) {
                const fileObjects = sessionFiles
                    .map(sf => fileStorage.getFileObject(sf))
                    .filter((f): f is ExtendedFile => f !== null);
                setUploadedFiles(fileObjects);
            }
        } catch (error) {
            console.error('Error loading session files:', error);
        }
    }, [fileStorage]);

    const handleFileUpload = useCallback(async (
        file: File,
        addUserMessage?: (message: string) => void
    ): Promise<void> => {
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
            setUploadedFiles(prev => [...prev, file as ExtendedFile]);
            addUserMessage?.(`✅ File "${file.name}" uploaded successfully`);
        } catch (error) {
            console.error('File upload error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addUserMessage?.(`❌ Failed to upload "${file.name}": ${errorMessage}`);
        } finally {
            setIsUploading(false);
        }
    }, [uploadedFiles, isUploading, fileStorage]);

    const removeFile = useCallback(async (
        fileToRemove: string | File,
        addUserMessage?: (message: string) => void
    ): Promise<void> => {
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addUserMessage?.(`❌ Failed to remove "${fileName}": ${errorMessage}`);
        }
    }, [uploadedFiles, fileStorage]);

    const getAllContentAsString = useCallback(async (): Promise<string> => {
        if (uploadedFiles.length === 0) return '';

        try {
            const contentPromises = uploadedFiles.map(async (file) => {
                try {
                    const content = await readFileContent(file);
                    return `File: ${file.name}\n${content}`;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return `[Error reading ${file.name}: ${errorMessage}]`;
                }
            });

            const allContents = await Promise.all(contentPromises);
            return allContents.join('\n\n---\n\n');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get all content: ${errorMessage}`);
        }
    }, [uploadedFiles, readFileContent]);

    const displayFileContent = useCallback(async (file: File): Promise<string> => {
        try {
            const content = await readFileContent(file);
            return content.length > 200 ? content.substring(0, 200) + '...' : content;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return `[Error loading ${file.name}: ${errorMessage}]`;
        }
    }, [readFileContent]);

    const value: FileContextValue = {
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

export default FileProvider