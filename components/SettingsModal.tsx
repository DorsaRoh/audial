"use client";

import { useState, useEffect, useCallback } from "react";

// Available models
export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", provider: "anthropic" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "google" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "google" },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]["id"];

export interface Settings {
  model: ModelId;
  apiKey: string;
}

const DEFAULT_SETTINGS: Settings = {
  model: "claude-sonnet-4-20250514",
  apiKey: "",
};

const STORAGE_KEY = "audial-settings";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        model: parsed.model || DEFAULT_SETTINGS.model,
        apiKey: parsed.apiKey || DEFAULT_SETTINGS.apiKey,
      };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = useCallback(() => {
    onSettingsChange(localSettings);
    saveSettings(localSettings);
    onClose();
  }, [localSettings, onSettingsChange, onClose]);

  // Handle keyboard events at document level for reliable Escape detection
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        handleSave();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md mx-4"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-alt)" }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-all"
            style={{ color: "var(--text-alt)" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Model Selection */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-alt)", opacity: 0.8 }}
          >
            Model
          </label>
          <select
            value={localSettings.model}
            onChange={(e) =>
              setLocalSettings((s) => ({ ...s, model: e.target.value as ModelId }))
            }
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{
              background: "var(--bg)",
              color: "var(--text-alt)",
              border: "1px solid var(--border-right-panel)",
            }}
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* API Key Input */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-alt)", opacity: 0.8 }}
          >
            API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={localSettings.apiKey}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, apiKey: e.target.value }))
              }
              placeholder="sk-ant-..."
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm font-mono"
              style={{
                background: "var(--bg)",
                color: "var(--text-alt)",
                border: "1px solid var(--border-right-panel)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all"
              style={{ color: "var(--text-alt)", opacity: 0.6 }}
              title={showApiKey ? "Hide" : "Show"}
            >
              {showApiKey ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              color: "var(--text-alt)",
              border: "1px solid var(--border-right-panel)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "var(--accent)",
              color: "white",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

