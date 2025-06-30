// components/FileButtons.tsx
import React, { useState, useRef } from 'react';
import { FILE_CONFIG, FileWithId } from '../types/file';

interface FileButtonsProps {
    uploadedFiles: FileWithId[];
    onFileUpload: (file: File) => Promise<void>;
    onFileRemove: (file: string | File) => Promise<void>;
    formatFileName: (fileName: string) => string;
    isUploading: boolean;
}

const FileButtons: React.FC<FileButtonsProps> = ({
    uploadedFiles,
    onFileUpload,
    onFileRemove,
    formatFileName,
    isUploading,
}) => {
    const [hoveredFile, setHoveredFile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            onFileUpload(files[0]);
        }
        // Reset input to allow same file selection
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileRemove = (file: FileWithId, event: React.MouseEvent) => {
        event.stopPropagation();
        onFileRemove(file);
    };

    const canUploadMore = uploadedFiles.length < FILE_CONFIG.MAX_FILES;

    return (
        <div className="file-buttons-container">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept=".txt,.md,.log,.csv,.json,.pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.tif"
            />

            {/* Upload button */}
            {canUploadMore && (
                <button
                    className={`file-button upload-button ${isUploading ? 'uploading' : ''}`}
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    title={`Upload file (${uploadedFiles.length}/${FILE_CONFIG.MAX_FILES})`}
                >
                    {isUploading ? (
                        <div className="upload-spinner">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 11-6.219-8.56" />
                            </svg>
                        </div>
                    ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <line x1="9" y1="15" x2="12" y2="12" />
                            <line x1="15" y1="15" x2="12" y2="12" />
                        </svg>
                    )}
                </button>
            )}

            {/* File buttons */}
            {uploadedFiles.map((file) => (
                <button
                    key={file.id || file.name}
                    className="file-button file-item"
                    onMouseEnter={() => setHoveredFile(file.name)}
                    onMouseLeave={() => setHoveredFile(null)}
                    title={`${file.name} (${(file.size / 1024).toFixed(1)}KB)`}
                >
                    <div className="file-content">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14,2 14,8 20,8" />
                        </svg>
                        <span className="file-name">{formatFileName(file.name)}</span>
                    </div>

                    {hoveredFile === file.name && (
                        <button
                            className="remove-button"
                            onClick={(e) => handleFileRemove(file, e)}
                            title={`Remove ${file.name}`}
                        >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </button>
            ))}
        </div>
    );
};

export default FileButtons;