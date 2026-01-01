// session store for song generation
// manages song sessions, versions, and chat history with localstorage persistence

export type GenerationMode = "new" | "edit";

export interface SongVersion {
  id: string;
  createdAt: number;
  code: string;
  note?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  code?: string;
}

export interface SongSession {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  currentCode: string;
  versions: SongVersion[];
  chat: ChatMessage[];
}

export interface SessionState {
  currentSession: SongSession | null;
  mode: GenerationMode;
  previousSessions: SongSession[];
}

const STORAGE_KEY = "audial_session_state";
const MAX_PREVIOUS_SESSIONS = 10;

// generate a unique session id
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// generate a unique version id
function generateVersionId(): string {
  return `version_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// default code template
const DEFAULT_CODE = `setcpm(75)

// pad
$: note("<[g3,bb3,d4] [f3,a3,c4] [eb3,g3,bb3] [f3,a3,c4]>")
  .s("sawtooth")
  .lpf(800)
  .gain(0.3)
  .slow(2)
  .room(0.4)

// bass
$: note("g2 ~ f2 ~ eb2 ~ f2 ~").s("sine").lpf(300).gain(0.4).slow(2)

// drums
$: s("bd ~ ~ ~ bd ~ ~ ~").gain(0.25).lpf(200)

// shimmer
$: note("g5 ~ ~ bb5 ~ ~ d6 ~").s("sine").gain(0.2).delay(0.3)
`;

// load state from localstorage
function loadState(): SessionState {
  if (typeof window === "undefined") {
    return { currentSession: null, mode: "edit", previousSessions: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SessionState;
      // always default to edit mode
      return { ...parsed, mode: "edit" };
    }
  } catch (err) {
    console.warn("[sessionstore] failed to load state:", err);
  }

  return { currentSession: null, mode: "edit", previousSessions: [] };
}

// save state to localstorage
function saveState(state: SessionState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[sessionstore] failed to save state:", err);
  }
}

// session store class
class SessionStore {
  private state: SessionState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = loadState();
  }

  // subscribe to state changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // notify all listeners
  private notify(): void {
    saveState(this.state);
    this.listeners.forEach((listener) => listener());
  }

  // get current state
  getState(): SessionState {
    return this.state;
  }

  // start a new session
  startNewSession(initialCode?: string): SongSession {
    const now = Date.now();

    // archive current session if it exists and has content
    if (this.state.currentSession && this.state.currentSession.chat.length > 0) {
      this.state.previousSessions = [
        this.state.currentSession,
        ...this.state.previousSessions,
      ].slice(0, MAX_PREVIOUS_SESSIONS);
    }

    const newSession: SongSession = {
      sessionId: generateSessionId(),
      createdAt: now,
      updatedAt: now,
      currentCode: initialCode || DEFAULT_CODE,
      versions: [],
      chat: [],
    };

    this.state = {
      ...this.state,
      currentSession: newSession,
      mode: "new",
    };

    this.notify();
    return newSession;
  }

  // ensure we have a session (create if needed)
  ensureSession(): SongSession {
    if (!this.state.currentSession) {
      return this.startNewSession();
    }
    return this.state.currentSession;
  }

  // append a user message
  appendUserMessage(text: string): ChatMessage {
    const session = this.ensureSession();
    const message: ChatMessage = {
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    session.chat = [...session.chat, message];
    session.updatedAt = Date.now();

    this.state = { ...this.state, currentSession: { ...session } };
    this.notify();

    return message;
  }

  // append an assistant message
  appendAssistantMessage(text: string, code?: string): ChatMessage {
    const session = this.ensureSession();
    const message: ChatMessage = {
      role: "assistant",
      content: text,
      createdAt: Date.now(),
      code,
    };

    session.chat = [...session.chat, message];
    session.updatedAt = Date.now();

    this.state = { ...this.state, currentSession: { ...session } };
    this.notify();

    return message;
  }

  // update the last assistant message (for streaming updates)
  updateLastAssistantMessage(text: string, code?: string): void {
    const session = this.state.currentSession;
    if (!session || session.chat.length === 0) return;

    const lastMsg = session.chat[session.chat.length - 1];
    if (lastMsg.role !== "assistant") return;

    session.chat = session.chat.map((msg, i) =>
      i === session.chat.length - 1
        ? { ...msg, content: text, code }
        : msg
    );
    session.updatedAt = Date.now();

    this.state = { ...this.state, currentSession: { ...session } };
    this.notify();
  }

  // apply new code (pushes old to versions, updates current)
  // note: does NOT auto-switch mode - mode changes are explicit user actions only
  applyNewCode(code: string, note?: string): void {
    const session = this.ensureSession();

    // only add to versions if current code is different and non-empty
    if (session.currentCode && session.currentCode.trim() !== code.trim()) {
      const version: SongVersion = {
        id: generateVersionId(),
        createdAt: Date.now(),
        code: session.currentCode,
        note: note || `version ${session.versions.length + 1}`,
      };
      session.versions = [...session.versions, version];
    }

    session.currentCode = code;
    session.updatedAt = Date.now();

    // preserve current mode - do not auto-switch
    this.state = {
      ...this.state,
      currentSession: { ...session },
    };
    this.notify();
  }

  // set current code without creating a version (for initial load)
  setCurrentCode(code: string): void {
    const session = this.ensureSession();
    session.currentCode = code;
    session.updatedAt = Date.now();
    this.state = { ...this.state, currentSession: { ...session } };
    this.notify();
  }

  // clear current session chat (keep code)
  clearChat(): void {
    const session = this.state.currentSession;
    if (!session) return;

    session.chat = [];
    session.updatedAt = Date.now();

    this.state = { ...this.state, currentSession: { ...session } };
    this.notify();
  }

}

// singleton instance
let storeInstance: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (!storeInstance) {
    storeInstance = new SessionStore();
  }
  return storeInstance;
}

export { DEFAULT_CODE };

