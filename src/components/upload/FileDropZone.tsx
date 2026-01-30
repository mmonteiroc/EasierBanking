import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import './FileDropZone.css';

interface FileDropZoneProps {
    onFilesDropped: (files: File[]) => void;
    isLoading?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onFilesDropped, isLoading }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        setError(null);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const csvFiles = droppedFiles.filter(f => f.name.endsWith('.csv') || f.type === 'text/csv');

        if (csvFiles.length === 0) {
            setError('Please ignore invalid files and drop only CSV bank statements.');
            return;
        }

        onFilesDropped(csvFiles);
    }, [onFilesDropped]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            onFilesDropped(files);
        }
    }, [onFilesDropped]);

    return (
        <div
            className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                multiple
                accept=".csv"
                onChange={handleFileInput}
                id="file-upload"
                className="file-input"
            />

            <div className="drop-content">
                <div className="icon-wrapper">
                    <Upload size={48} className="upload-icon" />
                </div>
                <h3>Import Bank Statements</h3>
                <p className="drop-hint">Drag & drop your CSV files here, or <label htmlFor="file-upload" className="browse-link">browse</label></p>
                <p className="file-types">Supports .csv (Standard Swiss Format)</p>

                {error && (
                    <div className="error-message">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {isLoading && <div className="loading-overlay">Processing...</div>}
            </div>
        </div>
    );
};
