"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore, useMemo } from "react";
import type { StrudelAdapter, StrudelError } from "./StrudelHost";
import { parseClaudeOutput, isCodeUnchanged } from "@/lib/parseOutput";
import {
  getSessionStore,
  DEFAULT_CODE,
} from "@/lib/sessionStore";
import type { Settings } from "./SettingsModal";

// format strudel errors for display with line info
function formatStrudelError(err: unknown): string {
  if (!err) return "unknown error";

  let message = "";
  
  // check if it's a strudel error with line info
  if (err && typeof err === "object" && "line" in err) {
    const se = err as StrudelError;
    message = se.message || "strudel error";
  } else if (err instanceof Error) {
    message = err.message;
  } else {
    message = String(err);
  }

  // Clean up the error message for better readability
  // Extract the core parse error message
  if (message.includes("[mini] parse error")) {
    // Format: "[mini] parse error at line X: Expected ... but "Y" found."
    const match = message.match(/\[mini\] parse error at line (\d+): (.+)/);
    if (match) {
      return `parse error at line ${match[1]}: ${match[2]}`;
    }
  }
  
  // Remove redundant prefixes
  message = message.replace(/^strudel error: /i, "");
  
  return message;
}

interface ClaudePanelProps {
  strudelAdapter: StrudelAdapter | null;
  isMobile?: boolean;
  settings?: Settings;
  onInfoClick?: () => void;
  externalPlaybackStarted?: number; // timestamp to trigger sync
}

// quick action presets
const QUICK_ACTIONS = [
  { label: "darker", prompt: "make it darker and moodier" },
  { label: "+drums", prompt: "add more interesting drums" },
  { label: "faster", prompt: "increase the tempo and energy" },
  { label: "slower", prompt: "slow it down, more ambient" },
  { label: "+bass", prompt: "add a heavier bassline" },
  { label: "minimal", prompt: "strip it down to essentials" },
];

export default function ClaudePanel({ strudelAdapter, isMobile = false, settings, onInfoClick, externalPlaybackStarted }: ClaudePanelProps) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawErrorResponse, setRawErrorResponse] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const accumulatedTextRef = useRef<string>("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // session store subscription using useSyncExternalStore
  const store = getSessionStore();
  const sessionState = useSyncExternalStore(
    store.subscribe.bind(store),
    store.getState.bind(store),
    store.getState.bind(store)
  );

  const currentSession = sessionState.currentSession;
  // memoize to prevent useEffect dependency changes on every render
  const chatMessages = useMemo(() => currentSession?.chat || [], [currentSession?.chat]);

  // initialize session on mount
  useEffect(() => {
    if (!currentSession) {
      store.ensureSession();
    }
  }, [currentSession, store]);

  // sync isPlaying when external playback starts (e.g., from export)
  useEffect(() => {
    if (externalPlaybackStarted && strudelAdapter) {
      setIsPlaying(strudelAdapter.isPlaying());
    }
  }, [externalPlaybackStarted, strudelAdapter]);

  // sync editor code to session when adapter is ready
  useEffect(() => {
    if (strudelAdapter && currentSession?.currentCode) {
      const editorCode = strudelAdapter.getCode();
      // only sync if editor has default code and session has different code
      if (editorCode === DEFAULT_CODE && currentSession.currentCode !== DEFAULT_CODE) {
        strudelAdapter.setCode(currentSession.currentCode);
      }
    }
  }, [strudelAdapter, currentSession?.currentCode]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setError(null);
    setRawErrorResponse(null);
    setIsGenerating(true);
    accumulatedTextRef.current = "";

    const userPrompt = prompt.trim();
    setPrompt("");

    // get current code from editor
    const currentCode = strudelAdapter ? strudelAdapter.getCode() : undefined;

    // add user message to session
    store.appendUserMessage(userPrompt);

    // add placeholder assistant message
    store.appendAssistantMessage("generating...");

    try {
      if (!strudelAdapter) {
        throw new Error("editor not ready");
      }

      // sync current code to session before generating
      if (currentCode) {
        store.setCurrentCode(currentCode);
      }

      // determine mode: if there's real code, edit it; otherwise treat as new
      const hasRealCode = currentCode && currentCode.trim() !== "" && currentCode !== DEFAULT_CODE;
      const effectiveMode = hasRealCode ? "edit" : "new";

      let response: Response;
      try {
        response = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userPrompt,
            mode: effectiveMode,
            currentCode: effectiveMode === "edit" ? currentCode : undefined,
            chatHistory: chatMessages.slice(-10),
            sessionId: currentSession?.sessionId,
            model: settings?.model,
            apiKey: settings?.apiKey,
          }),
        });
      } catch {
        // Network error - couldn't reach the server at all
        throw new Error("Network error: Could not connect to the server. Please check your internet connection.");
      }

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Response wasn't JSON, use status-based message
          if (response.status === 401) {
            errorMessage = "Invalid API key. Please check your API key in Settings.";
          } else if (response.status === 400) {
            errorMessage = "Bad request. Please check your settings.";
          } else if (response.status === 429) {
            errorMessage = "Rate limited. Please wait a moment and try again.";
          } else if (response.status >= 500) {
            errorMessage = "Server error. Please try again later.";
          }
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("no response stream");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

          for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                accumulatedTextRef.current += parsed.delta.text;
              } else if (parsed.type === "status") {
                if (parsed.status !== "generating...") {
                  setStatus(parsed.status);
                }
              } else if (parsed.type === "clear") {
                accumulatedTextRef.current = "";
              } else if (parsed.type === "error") {
                throw new Error(parsed.error?.message || "stream error");
              }
            } catch (parseErr) {
              // If it's an error we threw (not a JSON parse error), re-throw it
              if (parseErr instanceof Error && !parseErr.message.includes("JSON")) {
                throw parseErr;
              }
              // Otherwise it's an incomplete JSON chunk - ignore and continue
            }
          }
        }
      }

      const fullText = accumulatedTextRef.current;

      // Check for empty response
      if (!fullText || fullText.trim() === "") {
        throw new Error("Empty response from AI. The model may be overloaded - please try again.");
      }

      // use strict parser
      const parseResult = parseClaudeOutput(fullText);

      if (!parseResult.success || !parseResult.code) {
        setRawErrorResponse(parseResult.rawResponse || fullText);
        // Provide more specific error message
        const errorDetail = parseResult.error || "The AI response didn't contain valid code";
        throw new Error(errorDetail);
      }

      const newCode = parseResult.code;

      // check if code is unchanged (for edit mode)
      const codeUnchanged = currentCode && isCodeUnchanged(currentCode, newCode);

      // apply code atomically
      strudelAdapter.setCode(newCode);

      // update session with new code
      if (!codeUnchanged) {
        store.applyNewCode(newCode, userPrompt);
      }

      // update the assistant message
      const visualStatus = "";
      store.updateLastAssistantMessage(
        codeUnchanged ? "✓ no changes needed" : `✓ done${visualStatus}`,
        newCode
      );

      setStatus("starting...");

      // run the generated code and surface any strudel errors
      try {
        await strudelAdapter.run();
        setError(null);
      } catch (runErr) {
        const errorMsg = formatStrudelError(runErr);
        setError(errorMsg);
      }

      setStatus(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "failed";
      setError(msg);
      // update the placeholder message to show error
      store.updateLastAssistantMessage(`✗ ${msg}`);
      setStatus(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleQuickAction = (actionPrompt: string) => {
    // quick actions just set the prompt - do not force mode switch
    // user can use quick actions in any mode
    setPrompt(actionPrompt);
  };

  const handleRun = async () => {
    if (!strudelAdapter) return;
    try {
      await strudelAdapter.run();
      setIsPlaying(true);
      setError(null);
    } catch (runErr) {
      const errorMsg = formatStrudelError(runErr);
      setError(errorMsg);
    }
  };

  const handleStop = async () => {
    if (!strudelAdapter) return;
    try {
      await strudelAdapter.stop();
      setIsPlaying(false);
      setError(null);
    } catch {
      // Stop error silently handled
    }
  };

  // Toggle play/stop
  const handlePlayToggle = async () => {
    if (isPlaying) {
      await handleStop();
    } else {
      await handleRun();
    }
  };

  // start fresh session - clears everything including chat
  const handleStartFresh = useCallback(() => {
    if (!strudelAdapter) return;
    strudelAdapter.stop();
    setIsPlaying(false);
    strudelAdapter.setCode(DEFAULT_CODE);
    store.startNewSession(DEFAULT_CODE);
    setError(null);
    setRawErrorResponse(null);
    setStatus("started fresh session");
    setTimeout(() => setStatus(null), 1500);
  }, [strudelAdapter, store]);

  const handleRecallCode = useCallback(
    (code: string) => {
      if (!strudelAdapter || !code) return;
      strudelAdapter.stop();
      setIsPlaying(false);
      strudelAdapter.setCode(code);
      store.setCurrentCode(code);
      // do not auto-switch mode - user can recall in any mode
      setError(null);
      setStatus("recalled from history");
      setTimeout(() => setStatus(null), 1500);
    },
    [strudelAdapter, store]
  );

  const clearHistory = useCallback(() => {
    if (!strudelAdapter) return;
    strudelAdapter.stop();
    setIsPlaying(false);
    strudelAdapter.setCode(DEFAULT_CODE);
    store.setCurrentCode(DEFAULT_CODE);
    store.clearChat();
    setError(null);
    setRawErrorResponse(null);
    setStatus("chat and editor reset");
    setTimeout(() => setStatus(null), 1500);
  }, [strudelAdapter, store]);


  // Runtime errors should persist until user takes action (no auto-clear)
  // Only clear rawErrorResponse after a delay for non-runtime errors
  useEffect(() => {
    if (rawErrorResponse && !error?.includes('strudel') && !error?.includes('parse error')) {
      const timer = setTimeout(() => {
        setRawErrorResponse(null);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [rawErrorResponse, error]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div
      className="flex flex-col h-full min-h-0 min-w-0"
      style={{ fontSize: "var(--panel-font-size)" }}
    >

      {/* chat log */}
      <div ref={chatContainerRef} className={`flex-1 overflow-y-auto px-3 md:px-4 min-h-0 ${isMobile ? 'text-sm' : ''}`} style={{ paddingTop: isMobile ? '12px' : '24px', paddingBottom: isMobile ? '8px' : '16px' }}>
        {chatMessages.length === 0 ? (
          <div
            className={`text-dim text-center break-words ${isMobile ? 'pt-4' : 'pt-8'}`}
            style={{ color: "var(--text-alt)", opacity: 0.6 }}
          >
            describe the music you want — instrumentals, texture, experience...
          </div>
        ) : (
          <div className="flex flex-col gap-2 md:gap-3 min-w-0">
            {chatMessages.map((msg, idx) => (
              <div
                key={`${msg.createdAt}-${idx}`}
                className={`break-words flex items-center gap-2 ${
                  msg.role === "user" ? "font-medium" : "text-dim pl-3 md:pl-4"
                }`}
                style={{
                  color: "var(--text-alt)",
                  opacity: msg.role === "user" ? 1 : 0.6,
                }}
              >
                {msg.content === "generating..." && (
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                {msg.content.startsWith("✓") ? (
                  <span>
                    <span className="text-xl md:text-2xl" style={{ fontSize: isMobile ? "1.2em" : "1.5em", lineHeight: "1" }}>✓</span>
                    <span>{msg.content.slice(1)}</span>
                  </span>
                ) : (
                  <span>{msg.content}</span>
                )}
                {msg.code && (
                  <button
                    onClick={() => handleRecallCode(msg.code!)}
                    className="ml-1 md:ml-2 opacity-50 transition-opacity flex-shrink-0"
                    style={{ color: "var(--text-alt)", fontSize: isMobile ? "1.2em" : "1.5em", lineHeight: "1" }}
                    title="Recall This Code"
                  >
                    ↺
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* quick actions */}
      <div className="flex-shrink-0 px-2 md:px-4 py-1 md:py-2 flex flex-wrap gap-1 md:gap-1.5 justify-center">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action.prompt)}
            disabled={isGenerating}
            className="px-2 md:px-2.5 py-0.5 md:py-1 text-xs rounded-full transition-all"
            style={{
              color: "var(--text-alt)",
              background: "var(--bg)",
              border: "1px solid var(--border-right-panel)",
              opacity: isGenerating ? 0.4 : 0.7,
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* status and error display */}
      <div className="px-2 md:px-4 py-1 flex-shrink-0 min-h-[20px] md:min-h-[24px]">
        {status && !error && status !== "generating..." && (
          <div
            className="text-xs flex items-center justify-center gap-2"
            style={{ color: "var(--text-alt)", opacity: 0.6 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "var(--accent)" }}
            />
            {status}
          </div>
        )}
        {error && (
          <div
            className="text-xs px-2 md:px-3 py-2 md:py-2.5 rounded-md font-mono break-words relative"
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#ef4444",
            }}
          >
            <button
              onClick={() => { setError(null); setRawErrorResponse(null); }}
              className="absolute top-1 right-1 p-1 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "#ef4444" }}
              title="Dismiss error"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="pr-5">
              <span className="font-bold">⚠ error: </span>
              {error}
            </div>
            {rawErrorResponse && !isMobile && (
              <details className="mt-2">
                <summary className="cursor-pointer opacity-70">
                  show raw response
                </summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap opacity-60 max-h-32 overflow-y-auto">
                  {rawErrorResponse.substring(0, 500)}
                  {rawErrorResponse.length > 500 && "..."}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* controls */}
      <div className={`flex-shrink-0 flex items-center justify-center gap-2 md:gap-4 py-2 md:py-4 ${isMobile ? 'px-2' : ''}`}>
        {/* play/stop toggle - prominent */}
        <button
          onClick={handlePlayToggle}
          className="play-button rounded-xl md:rounded-2xl flex items-center justify-center gap-2"
          style={{ 
            minWidth: isMobile ? "80px" : "100px",
            height: isMobile ? "56px" : "72px",
            paddingLeft: isMobile ? "16px" : "20px",
            paddingRight: isMobile ? "20px" : "24px",
            background: isPlaying ? "var(--text-alt)" : "var(--surface)",
            color: isPlaying ? "var(--surface)" : "var(--text-alt)",
            border: isPlaying ? "none" : "1px solid var(--border-right-panel)",
            boxShadow: "none",
            transition: "background-color 0.2s, color 0.2s, border 0.2s, box-shadow 0.2s",
            transform: "none",
            WebkitTapHighlightColor: "transparent"
          }}
          onMouseDown={(e) => e.preventDefault()}
          title={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? (
            /* stop icon - square */
            <svg className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            /* play icon - triangle */
            <svg className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          )}
          <span className="text-sm md:text-base font-medium">{isPlaying ? "stop" : "play"}</span>
        </button>
        
        {chatMessages.length > 0 && (
          <button
            onClick={handleStartFresh}
            className="rounded-md flex items-center justify-center gap-1 h-7 md:h-8 px-2 md:px-2.5 transition-all text-xs"
            style={{ 
              color: "var(--text-alt)",
              border: "1px solid var(--border-right-panel)",
              opacity: 0.7
            }}
            title="New Song"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{isMobile ? 'new' : 'new song'}</span>
          </button>
        )}
        
        {chatMessages.length > 0 && (
          <button
            onClick={clearHistory}
            className="rounded-md flex items-center justify-center gap-1 h-7 md:h-8 px-2 md:px-2.5 transition-all text-xs"
            style={{ 
              color: "var(--text-alt)",
              border: "1px solid var(--border-right-panel)",
              opacity: 0.7
            }}
            title="Reset History"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>{isMobile ? 'reset' : 'reset history'}</span>
          </button>
        )}
      </div>

      {/* input */}
      <div className="flex-shrink-0 p-2 md:p-4 pt-0">
        <div
          className="flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-2 md:py-3"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border-right-panel)",
          }}
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGenerating
                ? "generating..."
                : isMobile ? "describe..." : "describe the music you want — instrumentals, texture, experience..."
            }
            className={`flex-1 bg-transparent focus:outline-none break-words ${isMobile ? 'text-sm' : ''}`}
            style={{
              color: "var(--text-alt)",
            }}
            disabled={isGenerating}
          />
          {onInfoClick && (
            <button
              onClick={onInfoClick}
              className="p-1 transition-opacity hover:opacity-100"
              style={{
                color: "var(--text-alt)",
                opacity: 0.5,
              }}
              title="About & License"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
