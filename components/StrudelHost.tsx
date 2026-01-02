"use client";

// Import and patch audio context BEFORE any other imports that might create AudioContext
import { audioRecorder } from "@/lib/audioRecorder";
audioRecorder.patchAudioContext();

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";

// strudel error with optional line number for ui display
export interface StrudelError extends Error {
  line?: number;
  column?: number;
  originalError?: unknown;
}

// helper to extract line number from strudel/js errors
function extractLineNumber(error: unknown): { line?: number; column?: number } {
  if (!error) return {};
  
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';
  
  // pattern: "at line X" or "line X" or ":X:" (line number in stack)
  const linePatterns = [
    /at line (\d+)/i,
    /line (\d+)/i,
    /:(\d+):(\d+)/,
    /\((\d+):(\d+)\)/,
  ];
  
  for (const pattern of linePatterns) {
    const match = msg.match(pattern) || stack?.match(pattern);
    if (match) {
      return {
        line: parseInt(match[1], 10),
        column: match[2] ? parseInt(match[2], 10) : undefined,
      };
    }
  }
  
  return {};
}

// create a strudel error with extracted context
function createStrudelError(error: unknown, context?: string): StrudelError {
  const msg = error instanceof Error ? error.message : String(error);
  const { line, column } = extractLineNumber(error);
  
  const prefix = context ? `${context}: ` : '';
  const lineInfo = line ? ` (line ${line})` : '';
  
  const strudelError = new Error(`${prefix}${msg}${lineInfo}`) as StrudelError;
  strudelError.line = line;
  strudelError.column = column;
  strudelError.originalError = error;
  strudelError.name = 'StrudelError';
  
  return strudelError;
}

export interface StrudelAdapter {
  getCode: () => string;
  setCode: (code: string) => void;
  run: () => Promise<void>;
  stop: () => Promise<void>;
  isPlaying: () => boolean;
  getAudioContext: () => AudioContext | null;
  getCps: () => number;
  exportOneLoop: () => Promise<Blob>;
}

export interface StrudelEditorHandle {
  updateCode: (code: string) => void;
  setGenerating: (generating: boolean) => void;
}

interface StrudelHostProps {
  onReady?: (adapter: StrudelAdapter) => void;
}

// default code with visual feedback - css ensures line numbers stay correct
const defaultCode = `setcpm(75)

// warm pad - gentle harmonic foundation
$: note("<[g3,bb3,d4] [f3,a3,c4] [eb3,g3,bb3] [f3,a3,c4]>")
  .s("sawtooth")
  .lpf(800)
  .gain(0.3)
  .slow(2)
  .room(0.4)

// bass - steady earth beneath
$: note("g2 ~ f2 ~ eb2 ~ f2 ~").s("sine").lpf(300).gain(0.4).slow(2)

// soft pulse - like distant heartbeat
$: s("bd ~ ~ ~ bd ~ ~ ~").gain(0.25).lpf(200)

// shimmer - occasional sparkle
$: note("g5 ~ ~ bb5 ~ ~ d6 ~").s("sine").gain(0.2).delay(0.3)
`;

const StrudelHost = forwardRef<StrudelEditorHandle, StrudelHostProps>(
  function StrudelHost({ onReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const strudelRef = useRef<any>(null);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const onReadyCalledRef = useRef(false);

    useImperativeHandle(ref, () => ({
      updateCode: (code: string) => {
        if (strudelRef.current) {
          strudelRef.current.setCode(code);
          strudelRef.current.code = code;
        }
      },
      setGenerating: (generating: boolean) => {
        setIsGenerating(generating);
      },
    }), []);

    useEffect(() => {
      setMounted(true);
      
      // Suppress specific Strudel/superdough errors (missing sounds, orbits)
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const msg = event.reason?.message || '';
        if (msg.includes('not found') || msg.includes('duck target orbit')) {
          event.preventDefault(); // Suppress the error in console
        }
      };
      
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, []);

    useEffect(() => {
      if (!wrapperRef.current || !strudelRef.current) return;

      // trigger codemirror layout recalculation on resize
      const triggerLayout = () => {
        if (strudelRef.current?.editor) {
          strudelRef.current.editor.requestMeasure();
        }
      };

      const resizeObserver = new ResizeObserver(() => {
        triggerLayout();
      });

      resizeObserver.observe(wrapperRef.current);

      const handleResize = () => {
        triggerLayout();
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      };
    }, [loading]);

    useEffect(() => {
      if (!mounted || !containerRef.current) return;
      if (strudelRef.current) return;

      let isCleanedUp = false;

      const init = async () => {
        try {
          const { StrudelMirror } = await import("@strudel/codemirror");
          const { transpiler } = await import("@strudel/transpiler");
          const { getAudioContext, webaudioOutput, initAudioOnFirstClick, registerSynthSounds, samples } = await import("@strudel/webaudio");
          const { evalScope, silence } = await import("@strudel/core");
          const { registerSoundfonts } = await import("@strudel/soundfonts");

          // Check if cleanup happened during async imports
          if (isCleanedUp) return;

          if (containerRef.current) containerRef.current.innerHTML = "";

          const mirror = new (StrudelMirror as any)({
            defaultOutput: webaudioOutput,
            getTime: () => getAudioContext().currentTime,
            transpiler,
            root: containerRef.current,
            initialCode: defaultCode,
            pattern: silence,
            drawTime: [-2, 2],
            autodraw: true,
            bgFill: false,
            prebake: async () => {
              initAudioOnFirstClick();
              
              const loadModules = evalScope(
                import("@strudel/core"),
                import("@strudel/codemirror"),
                import("@strudel/webaudio"),
                import("@strudel/draw"),
                import("@strudel/mini"),
                import("@strudel/tonal"),
              );
              // theme: white + pink (matches css variables)
              const { setTheme } = await import("@strudel/draw");
              setTheme({
                background: 'transparent',
                foreground: '#ff2255',
                caret: '#3b82f6',
                selection: 'rgba(255, 34, 85, 0.15)',
                selectionMatch: 'rgba(255, 34, 85, 0.08)',
                lineHighlight: 'rgba(255, 34, 85, 0.03)',
                gutterBackground: 'transparent',
                gutterForeground: '#9a9a9a',
              });
              // Load sample sources - use direct tidalcycles URL for dirt-samples
              const ds = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';
              const tc = 'https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main';
              // Direct URL to tidalcycles Dirt-Samples with cache-busting
              const dirtSamples = 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/strudel.json';
              await Promise.all([
                loadModules, 
                registerSynthSounds(), 
                registerSoundfonts(),
                samples(`${ds}/tidal-drum-machines.json`),
                samples(`${dirtSamples}?v=${Date.now()}`),
                samples(`${tc}/strudel.json`),
              ]);
              
              // Patch setLogger to suppress noisy errors (missing samples, orbits)
              const webaudioMod = await import("@strudel/webaudio") as any;
              if (webaudioMod.setLogger) {
                webaudioMod.setLogger((msg: string) => {
                  // Suppress duck orbit errors and missing sound warnings
                  if (msg.includes('duck target orbit') || msg.includes('not found')) {
                    return; // silently skip
                  }
                  // Other messages silently handled
                });
              }
              
              const { Pattern } = await import("@strudel/core");
              
              if (!(Pattern.prototype as any).silence) {
                (Pattern.prototype as any).silence = function() {
                  return silence;
                };
              }
              
              if (!(Pattern.prototype as any).o) {
                (Pattern.prototype as any).o = function(oct: number) {
                  return this.octave(oct);
                };
              }
              
              if (!(Pattern.prototype as any).acidenv) {
                (Pattern.prototype as any).acidenv = function(x: any) {
                  // .lpenv(x * 9).lps(.2).lpd(.12)
                  const scaledAmount = typeof x?.mul === 'function' 
                    ? x.mul(9) 
                    : (typeof x === 'number' ? x * 9 : 4.5);
                  return this.lpf(300).lpq(12).lpenv(scaledAmount).lps(0.2).lpd(0.12);
                };
              }
            },
            onToggle: (started: boolean) => {
              if (!isCleanedUp) setPlaying(started);
            },
          });

          // Check again after mirror creation
          if (isCleanedUp) {
            mirror.stop?.();
            return;
          }

          strudelRef.current = mirror;

          if (mirror.setFontFamily) mirror.setFontFamily("'IBM Plex Mono', ui-monospace, monospace");
          if (mirror.setLineNumbersDisplayed) mirror.setLineNumbersDisplayed(true);
          // enable line wrapping to prevent code from being cut off at split boundary
          if (mirror.setLineWrappingEnabled) mirror.setLineWrappingEnabled(true);
          // explicitly enable pattern highlighting (shows which code is currently playing)
          if (mirror.reconfigureExtension) mirror.reconfigureExtension('isPatternHighlightingEnabled', true);
          if (mirror.reconfigureExtension) mirror.reconfigureExtension('isFlashEnabled', true);

          if (!isCleanedUp) setLoading(false);
          
        } catch (err) {
          console.error("failed to initialize strudel:", err);
          if (!isCleanedUp) setLoading(false);
        }
      };

      init();

      return () => {
        isCleanedUp = true;
        if (strudelRef.current) {
          strudelRef.current.stop?.();
          strudelRef.current = null;
        }
        onReadyCalledRef.current = false;
      };
    }, [mounted]);

    useEffect(() => {
      if (!loading && strudelRef.current && onReady && !onReadyCalledRef.current) {
        onReadyCalledRef.current = true;
        
        let audioContextRef: AudioContext | null = null;
        
        const adapter: StrudelAdapter = {
          getCode: () => strudelRef.current?.code || "",
          setCode: (code: string) => {
            if (strudelRef.current) {
              strudelRef.current.setCode(code);
              strudelRef.current.code = code;
            }
          },
          run: async () => {
            if (strudelRef.current) {
              try {
                await strudelRef.current.stop();
                await new Promise(resolve => setTimeout(resolve, 50));
                await strudelRef.current.evaluate();
                const { getAudioContext } = await import("@strudel/webaudio");
                audioContextRef = getAudioContext();
                // Initialize audio recorder with the context
                if (audioContextRef) {
                  audioRecorder.init(audioContextRef);
                }
              } catch (err) {
                // create a structured error with line number extraction
                const strudelError = createStrudelError(err, 'strudel error');
                console.error("[strudelhost] evaluate error:", strudelError.message);
                throw strudelError;
              }
            }
          },
          stop: async () => {
            if (strudelRef.current) {
              await strudelRef.current.stop();
            }
          },
          isPlaying: () => {
            // Check actual scheduler state to avoid stale closure
            const repl = (strudelRef.current as any)?.repl;
            return repl?.scheduler?.started ?? false;
          },
          getAudioContext: () => audioContextRef,
          getCps: () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const repl = (strudelRef.current as any)?.repl;
            return repl?.scheduler?.cps || 0.5;
          },
          exportOneLoop: async () => {
            if (!strudelRef.current) {
              throw new Error("Strudel not ready");
            }

            // 1. Stop any existing playback first
            await strudelRef.current.stop();
            await new Promise(resolve => setTimeout(resolve, 100));

            // 2. Initialize audio recorder if needed
            if (!audioRecorder.isReady()) {
              const { getAudioContext, initAudio } = await import("@strudel/webaudio");
              await initAudio();
              const ctx = getAudioContext();
              if (ctx) {
                audioRecorder.init(ctx);
                audioContextRef = ctx;
              }
            }

            // 3. Get cycle duration
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const repl = (strudelRef.current as any)?.repl;
            const cps = repl?.scheduler?.cps || 0.5;
            const cycleDuration = 1 / cps;

            // 4. Start fresh playback - now audio will route through recorder
            await strudelRef.current.evaluate();
            await new Promise(resolve => setTimeout(resolve, 300));

            // 5. Record one loop and return MP3
            return audioRecorder.recordDuration(cycleDuration);
          },
        };
        onReady(adapter);
      }
    }, [loading, onReady, playing]);

    return (
      <div 
        ref={wrapperRef}
        className="h-full w-full min-h-0 min-w-0 relative strudel-container flex flex-col"
      >
        {/* loading state */}
        {(!mounted || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
            <div className="text-dim text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
              loading...
            </div>
          </div>
        )}

        {/* generating overlay */}
        {isGenerating && !loading && (
          <div className="absolute inset-0 flex items-start justify-center pt-6 z-20 pointer-events-none">
            <div className="px-4 py-2 flex items-center gap-2 rounded-full" style={{ background: 'var(--accent-soft)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--accent)' }}>streaming...</span>
            </div>
          </div>
        )}

        {/* editor */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 min-w-0 strudel-host"
          style={{
            visibility: loading ? "hidden" : "visible",
          }}
        />
      </div>
    );
  }
);

export default StrudelHost;
