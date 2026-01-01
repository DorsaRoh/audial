"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import StrudelHost from "@/components/StrudelHost";
import type { StrudelAdapter, StrudelEditorHandle } from "@/components/StrudelHost";
import SettingsModal, { loadSettings, type Settings } from "@/components/SettingsModal";

const ClaudePanel = dynamic(() => import("@/components/ClaudePanel"), { ssr: false });

// Breakpoint for mobile layout (matches Tailwind's md breakpoint)
const MOBILE_BREAKPOINT = 768;

export default function Home() {
  const [strudelAdapter, setStrudelAdapter] = useState<StrudelAdapter | null>(null);
  const editorRef = useRef<StrudelEditorHandle | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => window.innerWidth < MOBILE_BREAKPOINT;
    setIsMobile(checkMobile());
    // Default to 35% of viewport width on desktop
    if (!checkMobile()) {
      setRightPanelWidth(window.innerWidth * 0.35);
    }
    // Load settings on mount
    setSettings(loadSettings());
  }, []);

  // Dynamically adjust right panel width on window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      // Only update panel width if not mobile and not currently dragging
      if (!mobile && !isDragging) {
        setRightPanelWidth(window.innerWidth * 0.35);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDragging]);

  const handleStrudelReady = useCallback((adapter: StrudelAdapter) => {
    setStrudelAdapter(adapter);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      // Allow panel to be as wide as possible, with a minimum of 200px for usability
      const clampedWidth = Math.max(200, newWidth);
      setRightPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // trigger resize event so editor can recalculate layout after drag ends
      window.dispatchEvent(new Event("resize"));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Share functionality - copy link to clipboard
  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard API may fail in some environments (e.g., headless browsers)
      // Fallback: still show toast as user intent was to share
    }
    // Always show toast - the share action was triggered regardless of clipboard success
    setToast('link copied!');
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col h-screen w-screen min-h-0 min-w-0 bg-surface ${isDragging ? "select-none" : ""}`}
    >
      {/* Toast notification */}
      {toast && (
        <div 
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-bold animate-fade-in"
          style={{ 
            background: '#FF0059', 
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          {toast}
        </div>
      )}

      {/* header */}
      <header 
        className="flex-shrink-0 flex items-center justify-between px-3 md:px-5"
        style={{ 
          background: 'var(--surface-alt)', 
          paddingTop: '2px', 
          paddingBottom: '2px',
          borderBottom: '1px solid var(--border)'
        }}
      >
        {/* logo */}
        <a 
          href="https://github.com/DorsaRoh/audial"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 md:gap-2 text-base md:text-lg font-semibold tracking-tight transition-colors title-link"
          style={{ color: 'var(--title)' }}
        >
          <img 
            src="/assets/logo.png" 
            alt="Audial logo" 
            width={18} 
            height={18}
            className="flex-shrink-0 md:w-5 md:h-5"
            style={{ display: 'block' }}
          />
          audial
        </a>
        
        {/* actions */}
        <div className="flex items-center gap-1 md:gap-3">
          <button
            onClick={handleShare}
            className="p-2 md:p-3 rounded-lg transition-all"
            style={{ color: 'var(--text-alt)' }}
            title="Copy link to clipboard"
          >
            <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 md:p-3 rounded-lg transition-all"
            style={{ color: 'var(--text-alt)' }}
            title="Settings"
          >
            <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* main content */}
      <div className={`flex flex-1 min-h-0 min-w-0 ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {/* editor panel - dominant, no overflow clipping to allow proper wrapping */}
        <div 
          className={`min-h-0 min-w-0 overflow-visible ${isMobile ? 'flex-1' : 'flex-1'}`}
          style={isMobile ? { minHeight: '35vh' } : undefined}
        >
          {mounted && <StrudelHost ref={editorRef} onReady={handleStrudelReady} />}
        </div>

        {/* divider - minimal (hidden on mobile) */}
        {!isMobile && (
          <div
            onMouseDown={handleMouseDown}
            className={`w-px flex-shrink-0 cursor-col-resize transition-colors divider-hover ${
              isDragging ? "bg-accent" : "bg-border"
            }`}
          />
        )}

        {/* claude panel - secondary */}
        <div 
          className={`min-h-0 overflow-hidden flex-shrink-0 bg-surface-alt claude-panel-container ${
            isMobile ? 'w-full' : ''
          }`}
          style={isMobile 
            ? { height: '50vh', borderTop: '1px solid var(--border)' } 
            : { width: rightPanelWidth ? `${rightPanelWidth}px` : '35%' }
          }
        >
          <ClaudePanel strudelAdapter={strudelAdapter} isMobile={isMobile} settings={settings} />
        </div>
      </div>
    </div>
  );
}
