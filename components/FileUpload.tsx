import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, FileIcon, Image, FileText, File, Loader2 } from 'lucide-react';
import { filesApi } from '../services/apiService';
import { toast } from 'sonner';

interface UploadedFile {
    id: string;
    fileName: string;
    url: string;
    size: number;
    mimeType: string;
}

interface FileUploadProps {
    proposalId?: string;
    onFilesChange?: (files: UploadedFile[]) => void;
    maxFiles?: number;
    maxSizeMB?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
    proposalId,
    onFilesChange,
    maxFiles = 5,
    maxSizeMB = 10
}) => {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
        if (mimeType === 'application/pdf') return <FileText size={20} className="text-red-500" />;
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileText size={20} className="text-green-500" />;
        return <File size={20} className="text-slate-500" />;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleUpload = useCallback(async (fileList: FileList | File[]) => {
        const filesToUpload = Array.from(fileList);

        // Validate file count
        if (files.length + filesToUpload.length > maxFiles) {
            toast.error(`최대 ${maxFiles}개까지 업로드 가능합니다.`);
            return;
        }

        // Validate file sizes
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        const oversizedFiles = filesToUpload.filter(f => f.size > maxSizeBytes);
        if (oversizedFiles.length > 0) {
            toast.error(`파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`);
            return;
        }

        setIsUploading(true);

        try {
            const uploadPromises = filesToUpload.map(file =>
                filesApi.upload(file, proposalId)
            );

            const results = await Promise.all(uploadPromises);
            const newFiles = [...files, ...results];
            setFiles(newFiles);
            onFilesChange?.(newFiles);
            toast.success(`${results.length}개 파일이 업로드되었습니다.`);

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('파일 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
        }
    }, [files, maxFiles, maxSizeMB, proposalId, onFilesChange]);

    const handleRemove = useCallback(async (fileId: string) => {
        try {
            await filesApi.delete(fileId);
            const newFiles = files.filter(f => f.id !== fileId);
            setFiles(newFiles);
            onFilesChange?.(newFiles);
            toast.success('파일이 삭제되었습니다.');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('파일 삭제에 실패했습니다.');
        }
    }, [files, onFilesChange]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
        }
    }, [handleUpload]);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900">첨부 파일</label>

            {/* Upload Zone */}
            <div
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center 
          transition-all cursor-pointer group
          ${isDragging
                        ? 'border-primary bg-primary/10 scale-[1.02]'
                        : 'border-gray-300 bg-slate-50 hover:bg-primary/5 hover:border-primary/50'
                    }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleInputChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                />

                <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    {isUploading ? (
                        <Loader2 className="text-primary animate-spin" size={32} />
                    ) : (
                        <UploadCloud className="text-primary" size={32} />
                    )}
                </div>

                <p className="font-medium text-slate-900">
                    {isUploading ? '업로드 중...' : '클릭하거나 파일을 이곳으로 드래그하세요'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    PDF, JPG, PNG, XLSX (최대 {maxSizeMB}MB, {maxFiles}개까지)
                </p>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        >
                            {getFileIcon(file.mimeType)}

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">
                                    {file.fileName}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {formatFileSize(file.size)}
                                </p>
                            </div>

                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                보기
                            </a>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(file.id);
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
