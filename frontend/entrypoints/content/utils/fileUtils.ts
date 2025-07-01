
// Type definitions

import { FileWithId, StoredFileData, SUPPORTED_FILE_TYPES, FILE_CONFIG } from "../types/file";


interface FileStorage {
    validateFile: (file: File) => void;
    saveFile: (file: File) => Promise<StoredFileData>;
    loadFiles: () => StoredFileData[];
    deleteFile: (fileId: string) => boolean;
    getFileObject: (storedFile: StoredFileData) => FileWithId | null;
}

// Enhanced PDF text extraction
export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        console.log("extracting")
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
    } catch (error: any) {
        throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
};

// File storage utilities
export const createFileStorage = (): FileStorage => {
    const validateFile = (file: File): void => {
        if (file.size > FILE_CONFIG.MAX_SIZE) {
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

        if (currentFiles.length >= FILE_CONFIG.MAX_FILES) {
            throw new Error(`Maximum ${FILE_CONFIG.MAX_FILES} files allowed. Remove files first.`);
        }

        const totalSize = currentFiles.reduce((sum, f) => sum + f.size, 0);
        if (totalSize + file.size > FILE_CONFIG.MAX_TOTAL_SIZE) {
            throw new Error('Session storage full. Close and reopen tab to reset.');
        }
    };

    const saveFile = async (file: File): Promise<StoredFileData> => {
        validateFile(file);

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const fileData: StoredFileData = {
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
                    sessionStorage.setItem(FILE_CONFIG.STORAGE_KEY, JSON.stringify(existingFiles));
                    resolve(fileData);
                } catch (error) {
                    reject(new Error('Session storage quota exceeded. Try smaller files.'));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const loadFiles = (): StoredFileData[] => {
        try {
            const stored = sessionStorage.getItem(FILE_CONFIG.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            sessionStorage.removeItem(FILE_CONFIG.STORAGE_KEY);
            return [];
        }
    };

    const deleteFile = (fileId: string): boolean => {
        try {
            const files = loadFiles();
            const filteredFiles = files.filter(f => f.id !== fileId);
            sessionStorage.setItem(FILE_CONFIG.STORAGE_KEY, JSON.stringify(filteredFiles));
            return true;
        } catch (error) {
            return false;
        }
    };

    const getFileObject = (storedFile: StoredFileData): FileWithId | null => {
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
            }) as FileWithId;

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