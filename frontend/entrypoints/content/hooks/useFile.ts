import { FILE_CONFIG, FileStats, FileWithId, SupportedFileTypes } from "../types/file";
import { createFileStorage, extractTextFromPDF } from "../utils/fileUtils";

interface UseFileReturn {
    // State
    uploadedFiles: FileWithId[];
    isUploading: boolean;

    // File operations
    handleFileUpload: (file: File) => Promise<void>;
    removeFile: (fileToRemove: string | File) => Promise<void>;
    clearAllFiles: () => void;

    // Content operations
    readFileContent: (file: File) => Promise<string>;
    getFileContent: () => Promise<string>;
    displayFileContent: (file: File) => Promise<string>;

    // Utility functions
    formatFileName: (fileName: string) => string;
    loadSessionFiles: () => void;
    getFileStats: () => FileStats;

    // Cleanup
    cleanup: () => void;
}

export const useFile = (): UseFileReturn => {
    const [uploadedFiles, setUploadedFiles] = useState<FileWithId[]>([]);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const fileContentsRef = useRef<Map<string, string>>(new Map());
    const fileStorage = useMemo(() => createFileStorage(), []);

    // Cleanup on unmount
    useEffect(() => {
        return () => fileContentsRef.current.clear();
    }, []);

    const formatFileName = useCallback((fileName: string): string => {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return fileName;

        const name = fileName.substring(0, lastDotIndex);
        const extension = fileName.substring(lastDotIndex);

        return name.length > 5 ? `${name.substring(0, 5)}...${extension}` : fileName;
    }, []);

    const readFileContent = useCallback(async (file: File): Promise<string> => {
        try {
            const cacheKey = `${file.name}-${file.lastModified}-${file.size}`;
            if (fileContentsRef.current.has(cacheKey)) {
                return fileContentsRef.current.get(cacheKey)!;
            }

            let content: string;

            // Handle PDF files
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                console.log("reading as pdf")
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

            // Cache management - keep only 10 most recent
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
                    .filter((f): f is FileWithId => f !== null);
                setUploadedFiles(fileObjects);
            }
        } catch (error) {
            console.error('Error loading session files:', error);
        }
    }, [fileStorage]);

    const handleFileUpload = useCallback(async (file: File): Promise<void> => {
        if (!file || isUploading) return;

        // Check for existing file
        const existingFile = uploadedFiles.find(f =>
            f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
        );


        setIsUploading(true);

        try {
            await fileStorage.saveFile(file);
            setUploadedFiles(prev => [...prev, file as FileWithId]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('File upload error:', error);
        } finally {
            setIsUploading(false);
        }
    }, [uploadedFiles, isUploading, fileStorage]);

    const removeFile = useCallback(async (fileToRemove: string | File): Promise<void> => {
        try {
            const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
            const fileExists = uploadedFiles.find(f => f.name === fileName);

            if (!fileExists) return;

            // Delete from storage by filename instead of ID
            const allStoredFiles = fileStorage.loadFiles();
            const updatedFiles = allStoredFiles.filter(sf => sf.name !== fileName);
            sessionStorage.setItem(FILE_CONFIG.STORAGE_KEY, JSON.stringify(updatedFiles));

            // Update state
            setUploadedFiles(prev => prev.filter(f => f.name !== fileName));

            // Clear cache
            const cacheKeys = Array.from(fileContentsRef.current.keys());
            cacheKeys.filter(key => key.startsWith(fileName))
                .forEach(key => fileContentsRef.current.delete(key));

        } catch (error) {
            const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        }
    }, [uploadedFiles, fileStorage]);

    const getFileContent = useCallback(async (): Promise<string> => {
        if (uploadedFiles.length === 0) return '';

        try {
            const contentPromises = uploadedFiles.map(async (file): Promise<string> => {
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

    const clearAllFiles = useCallback((): void => {
        try {
            sessionStorage.removeItem(FILE_CONFIG.STORAGE_KEY);
            setUploadedFiles([]);
            fileContentsRef.current.clear();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        }
    }, []);

    const getFileStats = useCallback((): FileStats => {
        const totalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
        return {
            count: uploadedFiles.length,
            totalSize,
            totalSizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(1)}MB`,
            maxFiles: FILE_CONFIG.MAX_FILES,
            maxTotalSize: FILE_CONFIG.MAX_TOTAL_SIZE,
            remainingSlots: FILE_CONFIG.MAX_FILES - uploadedFiles.length,
            remainingSpace: FILE_CONFIG.MAX_TOTAL_SIZE - totalSize
        };
    }, [uploadedFiles]);

    // Initialize session files on first mount
    useEffect(() => {
        loadSessionFiles();
    }, [loadSessionFiles]);

    return {
        // State
        uploadedFiles,
        isUploading,

        // File operations
        handleFileUpload,
        removeFile,
        clearAllFiles,

        // Content operations
        readFileContent,
        getFileContent,
        displayFileContent,

        // Utility functions
        formatFileName,
        loadSessionFiles,
        getFileStats,

        // Cleanup
        cleanup: () => fileContentsRef.current.clear(),
    };
};