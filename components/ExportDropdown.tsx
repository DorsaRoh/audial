"use client";

import { useState, useRef, useEffect } from "react";
import type { StrudelAdapter } from "./StrudelHost";

interface ExportDropdownProps {
  strudelAdapter: StrudelAdapter | null;
  onToast: (message: string) => void;
  onPlaybackStart?: () => void;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadCodeAsFile(code: string, filename: string): void {
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}

export default function ExportDropdown({ strudelAdapter, onToast, onPlaybackStart }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleExportAudio = async () => {
    if (!strudelAdapter) {
      onToast("audio not ready");
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    setIsExporting(true);
    onPlaybackStart?.();

    try {
      const blob = await strudelAdapter.exportOneLoop();
      const timestamp = Date.now();
      const filename = `audial-${timestamp}.mp3`;
      downloadBlob(blob, filename);
      onToast("exported!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "export failed";
      onToast(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCode = () => {
    const code = strudelAdapter?.getCode();
    if (!code || !code.trim()) {
      onToast("no code to export");
      setIsOpen(false);
      return;
    }

    const timestamp = Date.now();
    const filename = `audial-${timestamp}.txt`;
    downloadCodeAsFile(code, filename);
    onToast("code exported!");
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => !isExporting && setIsOpen(!isOpen)}
        disabled={isExporting}
        className="p-2 md:p-3 rounded-lg transition-all"
        style={{ color: isExporting ? "#FF0059" : "var(--text-alt)" }}
        title="Export"
      >
        {isExporting ? (
          <svg
            className="w-5 h-5 md:w-7 md:h-7 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 md:w-7 md:h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            minWidth: "180px",
          }}
        >
          <button
            onClick={handleExportAudio}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-alt)" }}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Download Audio
          </button>
          <button
            onClick={handleExportCode}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-alt)" }}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Download Code
          </button>
        </div>
      )}
    </div>
  );
}
