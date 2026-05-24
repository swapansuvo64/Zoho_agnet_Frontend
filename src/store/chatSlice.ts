import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchChatSessions,
  fetchSessionHistory,
  deleteSession as apiDeleteSession,
  toggleSaveSession as apiToggleSave,
} from '../api/agent';
import type { ChatSession, ChatMessage } from '../api/agent';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  sidebarOpen: boolean;
  loadingSessions: boolean;
  loadingHistory: boolean;
  sessionError: string | null;
  agentToken: string | null;
  deletingSessionId: string | null;
  togglingSessionId: string | null;
}

const initialState: ChatState = {
  sessions: [],
  activeSessionId: null,
  messages: [],
  streamingText: '',
  isStreaming: false,
  sidebarOpen: true,
  loadingSessions: false,
  loadingHistory: false,
  sessionError: null,
  agentToken: null,
  deletingSessionId: null,
  togglingSessionId: null,
};

// ── Async thunks ─────────────────────────────────────────────────────────────

export const loadSessions = createAsyncThunk(
  'chat/loadSessions',
  async (token: string, { rejectWithValue }) => {
    try {
      return await fetchChatSessions(token);
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load sessions');
    }
  }
);

export const loadSessionHistory = createAsyncThunk(
  'chat/loadSessionHistory',
  async ({ sessionId, token }: { sessionId: string; token: string }, { rejectWithValue }) => {
    try {
      return await fetchSessionHistory(sessionId, token);
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load history');
    }
  }
);

export const deleteSessionThunk = createAsyncThunk(
  'chat/deleteSession',
  async ({ sessionId, token }: { sessionId: string; token: string }, { rejectWithValue }) => {
    try {
      await apiDeleteSession(sessionId, token);
      return sessionId;
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }
);

export const toggleSaveSessionThunk = createAsyncThunk(
  'chat/toggleSaveSession',
  async ({ sessionId, token }: { sessionId: string; token: string }, { rejectWithValue }) => {
    try {
      const isSaved = await apiToggleSave(sessionId, token);
      return { sessionId, isSaved };
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to toggle save');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setAgentToken: (state, action: PayloadAction<string>) => {
      state.agentToken = action.payload;
    },
    setActiveSession: (state, action: PayloadAction<string>) => {
      state.activeSessionId = action.payload;
      state.messages = [];
      state.streamingText = '';
      state.isStreaming = false;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    appendStreamChunk: (state, action: PayloadAction<string>) => {
      state.isStreaming = true;
      state.streamingText += action.payload;
    },
    commitStreamedMessage: (state) => {
      if (state.streamingText) {
        let cleanedText = state.streamingText;
        const prefixesToStrip = [
          "💭 *Just give me a moment... processing your confirmation and executing batch updates on Zoho Projects in parallel.*\n\n",
          "💭 *Just give me a moment... processing your confirmation and executing batch updates on Zoho Projects in parallel.*\r\n\r\n",
          "💭 Just give me a moment... processing your confirmation and executing batch updates on Zoho Projects in parallel.\n\n",
          "💭 *Just give me a moment... processing your confirmation and writing to Zoho Projects.*\n\n",
          "💭 *Just give me a moment... processing your confirmation and writing to Zoho Projects.*\r\n\r\n",
          "💭 Just give me a moment... processing your confirmation and writing to Zoho Projects.\n\n",
          "💭 *Just give me a moment... canceling your pending write action cleanly.*\n\n",
          "💭 *Just give me a moment... canceling your pending write action cleanly.*\r\n\r\n",
          "💭 Just give me a moment... canceling your pending write action cleanly.\n\n"
        ];
        prefixesToStrip.forEach(prefix => {
          cleanedText = cleanedText.replace(prefix, "");
        });
        cleanedText = cleanedText.trim() || state.streamingText;

        state.messages.push({
          id: `agent-${Date.now()}`,
          role: 'assistant',
          text: cleanedText,
          timestamp: new Date().toISOString(),
        });
      }
      state.streamingText = '';
      state.isStreaming = false;
    },
    clearStreamingText: (state) => {
      state.streamingText = '';
      state.isStreaming = false;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    closeCurrentSession: (state) => {
      state.messages = [];
      state.streamingText = '';
      state.isStreaming = false;
    },
    prependSession: (state, action: PayloadAction<ChatSession>) => {
      const exists = state.sessions.find(s => s.session_id === action.payload.session_id);
      if (!exists) {
        state.sessions.unshift(action.payload);
      }
    },
    updateSessionSummary: (state, action: PayloadAction<{ session_id: string; summary: string }>) => {
      const session = state.sessions.find(s => s.session_id === action.payload.session_id);
      if (session) {
        session.summary = action.payload.summary;
        session.total_turns = (session.total_turns || 0) + 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // loadSessions
      .addCase(loadSessions.pending, (state) => {
        state.loadingSessions = true;
        state.sessionError = null;
      })
      .addCase(loadSessions.fulfilled, (state, action: PayloadAction<ChatSession[]>) => {
        state.sessions = action.payload;
        state.loadingSessions = false;
      })
      .addCase(loadSessions.rejected, (state, action) => {
        state.loadingSessions = false;
        state.sessionError = action.payload as string;
      })
      // loadSessionHistory
      .addCase(loadSessionHistory.pending, (state) => {
        state.loadingHistory = true;
        state.messages = [];
      })
      .addCase(loadSessionHistory.fulfilled, (state, action: PayloadAction<ChatMessage[]>) => {
        state.loadingHistory = false;
        state.messages = action.payload.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.message,
          timestamp: m.created_at,
        }));
      })
      .addCase(loadSessionHistory.rejected, (state) => {
        state.loadingHistory = false;
      })
      // deleteSession
      .addCase(deleteSessionThunk.pending, (state, action) => {
        state.deletingSessionId = action.meta.arg.sessionId;
      })
      .addCase(deleteSessionThunk.fulfilled, (state, action: PayloadAction<string>) => {
        const deletedId = action.payload;
        state.sessions = state.sessions.filter(s => s.session_id !== deletedId);
        state.deletingSessionId = null;
        if (state.activeSessionId === deletedId) {
          state.activeSessionId = state.sessions[0]?.session_id ?? null;
          state.messages = [];
          state.streamingText = '';
          state.isStreaming = false;
        }
      })
      .addCase(deleteSessionThunk.rejected, (state) => {
        state.deletingSessionId = null;
      })
      // toggleSaveSession
      .addCase(toggleSaveSessionThunk.pending, (state, action) => {
        state.togglingSessionId = action.meta.arg.sessionId;
      })
      .addCase(toggleSaveSessionThunk.fulfilled, (state, action) => {
        const { sessionId, isSaved } = action.payload;
        const session = state.sessions.find(s => s.session_id === sessionId);
        if (session) session.is_saved = isSaved;
        state.togglingSessionId = null;
      })
      .addCase(toggleSaveSessionThunk.rejected, (state) => {
        state.togglingSessionId = null;
      });
  },
});

export const {
  setAgentToken,
  setActiveSession,
  addMessage,
  appendStreamChunk,
  commitStreamedMessage,
  clearStreamingText,
  toggleSidebar,
  setSidebarOpen,
  prependSession,
  updateSessionSummary,
  closeCurrentSession,
} = chatSlice.actions;

export default chatSlice.reducer;
