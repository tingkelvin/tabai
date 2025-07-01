
export interface SupportedFileTypes {
    [mimeType: string]: string[];
}

export interface FileWithId extends File {
    id?: string;
}

export interface StoredFileData {
    id: string;
    name: string;
    type: string;
    size: number;
    lastModified: number;
    content: string;
    uploadDate: string;
}

// Constants
export const SUPPORTED_FILE_TYPES: SupportedFileTypes = {
    'text/plain': ['.txt', '.md', '.log'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    'text/markdown': ['.md'],
    'application/pdf': ['.pdf'], // PDF support
    // Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    'image/bmp': ['.bmp'],
    'image/tiff': ['.tiff', '.tif']
};

export interface FileStats {
    count: number;
    totalSize: number;
    totalSizeFormatted: string;
    maxFiles: number;
    maxTotalSize: number;
    remainingSlots: number;
    remainingSpace: number;
}

// File Configuration Constants
export const FILE_CONFIG = {
    // Storage
    STORAGE_KEY: 'session_uploaded_files',

    // Size limits
    MAX_SIZE: 2 * 1024 * 1024, // 2MB per file
    MAX_TOTAL_SIZE: 4 * 1024 * 1024, // 4MB total
    MAX_FILES: 5, // Maximum number of files

    // Cache settings
    MAX_CACHE_SIZE: 10, // Maximum cached file contents

    // Display settings
    FILENAME_TRUNCATE_LENGTH: 5,
    PREVIEW_LENGTH: 200,
} as const;
