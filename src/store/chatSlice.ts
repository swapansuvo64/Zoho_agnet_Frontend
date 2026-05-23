import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchChatSessions, fetchSessionHistory } from '../api/agent';
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
  // Token cached for API calls
  agentToken: string | null;
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
};

export const loadSessions = createAsyncThunk(
  'chat/loadSessions',
  async (token: string, { rejectWithValue }) => {
    try {
      const sessions = await fetchChatSessions(token);
      return sessions;
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load sessions');
    }
  }
);

export const loadSessionHistory = createAsyncThunk(
  'chat/loadSessionHistory',
  async ({ sessionId, token }: { sessionId: string; token: string }, { rejectWithValue }) => {
    try {
      const history = await fetchSessionHistory(sessionId, token);
      return history;
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load history');
    }
  }
);

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
        state.messages.push({
          id: `agent-${Date.now()}`,
          role: 'assistant',
          text: state.streamingText,
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
    prependSession: (state, action: PayloadAction<ChatSession>) => {
      // Insert a new session at the top of the list (for new chats)
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
} = chatSlice.actions;

export default chatSlice.reducer;
