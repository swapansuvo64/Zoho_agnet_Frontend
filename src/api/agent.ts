import { apiClient } from './client';

const AGENT_BASE_URL = import.meta.env.VITE_AGENT_API_URL as string;

export interface ChatSession {
  session_id: string;
  summary: string | null;
  total_turns: number;
  created_at: string;
  updated_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}

/**
 * Fetch the raw access token from auth-service cookie store.
 * Required for WebSocket auth since browsers don't send HttpOnly cookies
 * in WS upgrade requests cross-origin.
 */
export async function fetchAccessToken(): Promise<string> {
  const res = await apiClient.get<{ token: string }>('/auth/token');
  return res.data.token;
}

/**
 * Fetch all past chat sessions for the current user, ordered newest first.
 */
export async function fetchChatSessions(token: string): Promise<ChatSession[]> {
  const url = `${AGENT_BASE_URL}/chat/sessions?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch sessions');
  const data = await res.json();
  return data.sessions ?? [];
}

/**
 * Fetch full message history for a given session.
 */
export async function fetchSessionHistory(sessionId: string, token: string): Promise<ChatMessage[]> {
  const url = `${AGENT_BASE_URL}/chat/history/${sessionId}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch session history');
  const data = await res.json();
  type RawMessage = { id?: string; session_id: string; role: 'user' | 'assistant'; message: string; created_at: string };
  return (data.history ?? []).map((m: RawMessage) => ({
    id: m.id ?? `${m.session_id}-${m.created_at}`,
    session_id: m.session_id,
    role: m.role,
    message: m.message,
    created_at: m.created_at,
  }));
}

/**
 * Create a new WebSocket connection to the agent for a given session.
 * Messages arrive as JSON: { type: 'chunk'|'done'|'error', text?: string }
 */
export function createAgentWebSocket(sessionId: string, token: string): WebSocket {
  const wsBase = AGENT_BASE_URL.replace(/^http/, 'ws');
  return new WebSocket(`${wsBase}/chat/ws/${sessionId}?token=${encodeURIComponent(token)}`);
}
