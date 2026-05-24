# Zoho Projects AI Agent — Frontend Portal

A premium, highly interactive chat interface built with **React**, **TypeScript**, and **Vite** that connects Zoho Projects with a stateful, multi-agent backend.

---

## 🏗️ State Management Architecture

The application state is managed using **Redux Toolkit** to ensure clean, unidirectional data flow, predictable state transitions, and responsive UI rendering.

```
                  ┌────────────────────────┐
                  │      React View        │
                  │ (ChatWindow & Sidebar) │
                  └───────────┬────────────┘
                              │
                    Dispatches Actions
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                      Redux Store                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐             ┌───────────────────┐  │
│  │   authSlice      │             │     chatSlice     │  │
│  ├──────────────────┤             ├───────────────────┤  │
│  │                  │             │                   │  │
│  │ • user           │             │ • sessions        │  │
│  │ • isAuthenticated│             │ • activeSessionId │  │
│  │                  │             │ • messages        │  │
│  │                  │             │ • streamingText   │  │
│  │                  │             │ • isStreaming     │  │
│  │                  │             │ • loadingSessions │  │
│  │                  │             │ • loadingHistory  │  │
│  └──────────────────┘             └───────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 1. Store Slices
*   **[authSlice.ts](file:///d:/Zoho_agent/Frontend/src/store/authSlice.ts)**: Manages Zoho OAuth login state, loading states, and portal-specific user info (e.g. portal ID, name, email).
*   **[chatSlice.ts](file:///d:/Zoho_agent/Frontend/src/store/chatSlice.ts)**: Houses the complete chat workspace logic, including session records, active session tracking, streaming message queues, and loading states.

### 2. Asynchronous Thunks (API Middleware)
All server requests are encapsulated inside async Redux thunks to handle side-effects and standard loading/error/success states:
*   `loadSessions`: Fetches all chat sessions from the database. Supports standard loads and silent background reloads.
*   `loadSessionHistory`: Loads the chronological message thread of a past session.
*   `deleteSessionThunk`: Removes a session from both the database and local state.
*   `toggleSaveSessionThunk`: Flags a session as bookmarked/saved, instantly bubbling it up to the **Saved** section of the sidebar.

### 3. Real-time WebSocket Integration
WebSocket streaming feeds text chunks directly into the Redux store in real-time:
*   `appendStreamChunk`: Appends streamed tokens to `streamingText` for real-time output display.
*   `commitStreamedMessage`: Once the agent completes generation (receives a `"done"` frame), it flushes the buffered text into the main `messages` array and resets streaming indicators.

---

## 🛠️ Key Implementations & Enhancements

We introduced several robust, production-grade features to optimize state synchronization, user experience, and visual aesthetics:

### 1. React 18 StrictMode Guard (Duplicate Prevention)
In React 18 development, `useEffect` runs twice on mount. To prevent two blank chat sessions from being created simultaneously when there are no past sessions:
*   The `prependSession` reducer checks if a local empty session already exists (0 turns and no summary).
*   If one is found, it **reuses the existing session** and updates its ID dynamically to match the latest UUID instead of prepending a duplicate entry.

### 2. Soft Reloading & Background Sync
We extended the `loadSessions` thunk to support a `{ soft: true }` parameter:
*   Standard loads display a loading spinner.
*   Soft loads keep `state.loadingSessions` set to `false`, allowing the session list to be silently refreshed in the background. The user can type immediately in their chat window while the sidebar updates smoothly.

### 3. Double Soft-Reload Timers
Because database operations (generating and saving summaries) run asynchronously in the background when a WebSocket connection closes, fetching the session list immediately can miss the newly saved summary.
We implemented double soft-reload timeouts when starting new chats or switching sessions:
*   **800ms Timeout**: Fetches session summaries from fast database cache operations.
*   **2500ms Timeout**: Fetches again to catch slower, newly generated LLM background summaries, guaranteeing they update in the sidebar.

### 4. Collapsible Agent Progress Status Drawers
To prevent system and tool logs from cluttering the conversational flow:
*   We created a regex parser (`progressRegex`) inside `MessageBubble.tsx` to identify agent tool calls (`⚙️ Using Tool:`) and confirmation logs (`🔐 Preparing confirmation`, `🔀 Planning parallel updates`).
*   These are folded neatly inside a collapsible drawer. Clicking the drawer expands it to reveal the technical execution steps.

### 5. Recursive Bold & Italic Markdown Link Parser
The LLM occasionally returns interactive buttons inside markdown bold/italic tags (e.g. `**[Member Name](member://...)**`).
*   Standard regex replacements often fail or leave raw markdown tags unparsed.
*   We implemented a recursive inline formatter (`inlineFormat()`) inside `MessageBubble.tsx` that unwraps bold/italic markers first and recursively parses links inside them, transforming them into Zoho interactive action buttons.

---

## 🚀 Running Locally

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Configure Environment**:
    Create a `.env` file based on `.env.example`:
    ```env
    VITE_AUTH_SERVICE_URL=http://localhost:8001
    VITE_AGENT_SERVICE_URL=http://localhost:8000
    ```
3.  **Start Dev Server**:
    ```bash
    npm run dev
    ```
