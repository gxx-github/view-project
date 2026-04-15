"use client";

import { useRef } from "react";
import { Send, Square, ImagePlus } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FilePreview } from "./FilePreview";

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  onSend: (files?: unknown[]) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ input, setInput, onSend, onStop, isLoading }: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pendingFiles, addFiles, removeFile, clearFiles, isDragOver, dragHandlers } = useFileUpload();

  const handleSend = () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;
    onSend(pendingFiles.length > 0 ? pendingFiles : undefined);
    clearFiles();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const canSend = input.trim() || pendingFiles.length > 0;

  return (
    <div className="mt-auto pt-3 px-2">
      <div
        className={`glass flex flex-col rounded-2xl shadow-xl transition-all ${
          isDragOver ? "ring-2 ring-pink-400 bg-pink-50/60" : ""
        }`}
        {...dragHandlers}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-pink-100/60 rounded-2xl z-10 pointer-events-none">
            <span className="text-sm text-pink-500 font-medium">释放以添加图片</span>
          </div>
        )}

        <FilePreview files={pendingFiles} onRemove={removeFile} />

        <div className="flex items-end gap-2 px-4 py-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-pink-400 hover:bg-pink-100/60 transition-colors shrink-0"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜电视剧、推荐好剧、查演员作品...（如：李乃文的剧）"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-pink-900 placeholder:text-pink-400/50 max-h-[8rem]"
            style={{ height: "auto", minHeight: "1.5rem" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `min(${el.scrollHeight}px, ${8 * parseFloat(getComputedStyle(document.documentElement).fontSize)}px)`;
            }}
          />
          {isLoading ? (
            <button
              onClick={onStop}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-400 text-white shadow-lg hover:bg-pink-500 active:scale-95 transition-all shrink-0"
            >
              <Square className="w-4 h-4" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-500 text-white shadow-lg hover:bg-pink-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-[0.6875rem] text-pink-500/40 mt-2.5">
        powered by 智谱 AI · 联网搜索 · Generative UI · Multi-Session
      </p>
    </div>
  );
}
