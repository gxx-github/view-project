"use client";

import { X } from "lucide-react";
import type { PendingFile } from "@/hooks/useFileUpload";

interface FilePreviewProps {
  files: PendingFile[];
  onRemove: (index: number) => void;
}

export function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
      {files.map((file, i) => (
        <div key={i} className="relative shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.url}
            alt={file.filename}
            className="w-16 h-16 rounded-xl object-cover border border-pink-200/40 shadow-sm"
          />
          <button
            onClick={() => onRemove(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
