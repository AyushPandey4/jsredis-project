# JSRedis - Frontend Dashboard

This package contains the modern, responsive, and real-time user interface for the JSRedis server. It is a Single Page Application built with React and Vite, designed for high performance and a clean user experience.

![JSRedis UI Screenshot](/assests/pic1.png)
![JSRedis UI Screenshot](/assests/pic2.png)

## 🛠️ Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4
- **Terminal Emulation:** `@xterm/xterm`
- **Charting:** `recharts`
- **Communication:** Native Browser WebSocket API

## 🏛️ Core Architecture

The UI is designed around a few key principles to keep it performant and maintainable.

### State Management
The primary application state (connection status, list of keys, server metrics) is managed in the top-level `App.jsx` component. This state is then passed down to child components via props. This centralized, "top-down" data flow makes the application's behavior predictable and easy to debug.

### Real-Time Communication (WebSockets)
All communication with the JSRedis backend is handled through a single, persistent WebSocket connection. This logic is encapsulated entirely within a custom hook, `useWebSocket.js`.

- **`useWebSocket.js` Hook:** This hook is the communication hub. It manages the WebSocket lifecycle (`connect`, `disconnect`), provides the connection `status`, and exposes a `sendMessage` function. All incoming messages are parsed as JSON and provided as the `lastMessage` state variable.

- **Messaging Protocol:** The UI communicates with the server using a strict JSON protocol where every message has a `type`:
    - **Client to Server:** Messages are objects like `{ "type": "command", "payload": "PING" }` or `{ "type": "subscribe", "channel": "keyspace" }`.
    - **Server to Client:** Messages are objects like `{ "type": "response", "payload": "+PONG\r\n" }` or `{ "type": "event", "event": "keys-initial", ... }`.

This explicit protocol eliminates ambiguity and makes the message handling logic in `App.jsx` robust and clear.

## 🧩 Component Breakdown

The UI is broken down into several key components:

-   **`App.jsx`**
    -   The main orchestrator of the application.
    -   Manages all primary state (`keys`, `metrics`, `status`).
    -   Uses the `useWebSocket` hook to handle all server communication.
    -   Conditionally renders the main dashboard or a "disconnected" state.
    -   Defines the responsive layout of the dashboard (stacking vertically on small screens).

-   **`ConnectionPanel.jsx`**
    -   A controlled component that contains the UI for connecting to the server.
    -   Features a single input for the WebSocket URL, a connect/disconnect button, and a real-time status indicator.
    -   Receives its default URL and connection status via props from `App.jsx`.

-   **`Terminal.jsx`**
    -   The most complex component. It acts as a custom React wrapper for the imperative `@xterm/xterm` library.
    -   It uses `useRef` to maintain a stable reference to the terminal instance and an input buffer.
    -   It handles all user key presses (`onData`), providing a true terminal-like experience for sending commands.
    -   It receives server responses via props (`lastMessage`) and writes them to the terminal display.

-   **`KeyBrowser.jsx`**
    -   A presentational component that displays a filterable list of keys from the server.
    -   Receives the array of `keys` as a prop from `App.jsx`.
    -   When a key is clicked, it calls the `onKeyClick` prop to trigger a `GET` command in the terminal.

-   **`MetricsPanel.jsx`**
    -   Visualizes real-time server statistics.
    -   Receives the latest `metrics` object and an array of `history` data points as props.
    -   Uses the `recharts` library to render a live-updating line chart for memory usage and commands-per-second.

## 🚀 Running in Development

To run the UI in development mode and connect it to a locally running server:

1.  Make sure the JSRedis server is running locally (e.g., via `npm run dev --workspace=@jsredis/server`).
2.  From the **root** of the monorepo, run the UI's dev script:
    ```sh
    npm run dev --workspace=@jsredis/ui
    ```
3.  The UI will be available at `http://localhost:5173` (or the next available port).

### Environment Variables
The UI is configured via environment variables. For local development, you can create a `.env.local` file in the `packages/ui` directory.

**`packages/ui/.env.local`**
```sh
VITE_WS_URL=ws://localhost:8080
```