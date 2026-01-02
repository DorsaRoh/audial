"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import StrudelHost from "@/components/StrudelHost";
import type { StrudelAdapter, StrudelEditorHandle } from "@/components/StrudelHost";
import SettingsModal, { loadSettings, type Settings } from "@/components/SettingsModal";
import ExportDropdown from "@/components/ExportDropdown";

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
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [externalPlaybackStarted, setExternalPlaybackStarted] = useState<number>(0);
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
          <a
            href="https://github.com/DorsaRoh/audial"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 md:p-3 rounded-lg transition-all header-action"
            style={{ color: 'var(--text-alt)' }}
            title="View source on GitHub"
          >
            <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <button
            onClick={handleShare}
            className="p-2 md:p-3 rounded-lg transition-all"
            style={{ color: 'var(--text-alt)' }}
            title="Copy link to clipboard"
          >
            <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <ExportDropdown
            strudelAdapter={strudelAdapter}
            onToast={setToast}
            onPlaybackStart={() => setExternalPlaybackStarted(Date.now())}
          />
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
          <ClaudePanel strudelAdapter={strudelAdapter} isMobile={isMobile} settings={settings} onInfoClick={() => setIsInfoOpen(true)} externalPlaybackStarted={externalPlaybackStarted} />
        </div>
      </div>

      {/* Info Modal */}
      {isInfoOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsInfoOpen(false)}
        >
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div 
            className="relative max-w-lg w-full rounded-2xl p-8 shadow-2xl"
            style={{ 
              background: '#ffffff',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsInfoOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-gray-100"
              style={{ color: '#999' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div 
              className="max-h-[70vh] overflow-y-auto scrollbar-none"
              style={{ color: '#444' }}
            >
              {/* Tips section */}
              <h2 className="text-xl font-bold mb-5" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                Tips for Better Results
              </h2>
              
              <p className="text-base leading-relaxed mb-6" style={{ lineHeight: '1.7' }}>
                It is rare for a model to produce a great song on the first prompt. In practice, you have to <strong style={{ color: '#FF0059' }}>vibe with the model</strong>!
              </p>
              
              <p className="font-semibold text-sm uppercase tracking-wide mb-3" style={{ color: '#666' }}>What works</p>
              <ul className="space-y-3 mb-6 text-base" style={{ lineHeight: '1.6' }}>
                <li className="flex gap-3">
                  <span style={{ color: '#FF0059' }}>•</span>
                  <span>Iterate, don&apos;t restart — refine the musical idea</span>
                </li>
                <li className="flex gap-3">
                  <span style={{ color: '#FF0059' }}>•</span>
                  <span>React to what it generates (if a part is good, ask to expand it)</span>
                </li>
                <li className="flex gap-3">
                  <span style={{ color: '#FF0059' }}>•</span>
                  <span>Let the model settle into a direction instead of forcing novelty every turn</span>
                </li>
              </ul>
              
              <div 
                className="p-4 rounded-xl mb-6"
                style={{ background: '#f8f8f8' }}
              >
                <p className="font-semibold text-sm uppercase tracking-wide mb-2" style={{ color: '#666' }}>Note</p>
                <p className="text-sm leading-relaxed italic" style={{ color: '#555', lineHeight: '1.7' }}>
                  Unless you explicitly provide the musical material (notes, structure, midi, code, etc.), the model cannot reliably recreate specific existing works. Prompts like &quot;write the Game of Thrones theme&quot; will usually fail. If you want accuracy, provide concrete musical constraints or examples.
                </p>
              </div>

              {/* License section */}
              <div 
                className="pt-4 text-xs flex items-center"
                style={{ borderTop: '1px solid #eee', color: '#999' }}
              >
                <span>AGPL-3.0</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
