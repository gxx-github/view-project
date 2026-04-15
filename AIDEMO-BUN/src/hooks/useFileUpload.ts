"use client";

import { useState, useCallback } from "react";

export interface PendingFile {
  type: "file";
  mediaType: string;
  filename: string;
  url: string; // data URL
}

export function useFileUpload() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise<PendingFile>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                type: "file" as const,
                mediaType: file.type,
                filename: file.name,
                url: reader.result as string,
              });
            };
            reader.readAsDataURL(file);
          })
      )
    ).then((newFiles) => {
      setPendingFiles((prev) => [...prev, ...newFiles]);
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  const dragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
  };

  return {
    pendingFiles,
    addFiles,
    removeFile,
    clearFiles,
    isDragOver,
    dragHandlers,
  };
}
