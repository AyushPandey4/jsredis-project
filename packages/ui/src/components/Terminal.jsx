import React, { useRef, useEffect } from 'react';
import { Terminal as XTermTerminal } from '@xterm/xterm';

const formatResponse = (response) => {
  return response.replace(/\r\n/g, '\n').trim();
};

export function Terminal({ sendMessage, lastMessage }) {
  const terminalRef = useRef(null);
  const termInstance = useRef(null);
  const inputBuffer = useRef(''); // <-- 1. Use useRef instead of useState for the input buffer

  // Effect to initialize the terminal
  useEffect(() => {
    if (terminalRef.current && !termInstance.current) {
      const term = new XTermTerminal({
        theme: {
          background: '#1a1b26',
          foreground: '#a9b1d6',
          cursor: '#c0caf5',
        },
        fontFamily: 'monospace',
        fontSize: 16,
        cursorBlink: true,
      });

      term.open(terminalRef.current);
      termInstance.current = term;

      // --- Input Handling ---
      term.onData(data => {
        const code = data.charCodeAt(0);
        if (code === 13) { // Enter
          if (inputBuffer.current.trim().length > 0) {
            sendMessage(inputBuffer.current); // <-- 2. Read from the ref
          }
          inputBuffer.current = ''; // <-- 3. Reset the ref
          term.writeln(''); // <-- 4. Add a newline for better UX
        } else if (code === 127) { // Backspace
          if (inputBuffer.current.length > 0) {
            term.write('\b \b');
            inputBuffer.current = inputBuffer.current.slice(0, -1); // <-- 5. Update the ref
          }
        } else if (code >= 32 && code <= 126) {
          inputBuffer.current += data; // <-- 6. Update the ref
          term.write(data);
        }
      });

      // --- Initial Welcome Message ---
      term.writeln('Welcome to JSRedis!');
      term.writeln('Type your commands below and press Enter.');
      term.write('> ');
    }

    return () => {
      termInstance.current?.dispose();
      termInstance.current = null;
    };
  }, []);

  // Effect to handle writing server responses
  useEffect(() => {
    if (lastMessage && termInstance.current) {
      const formatted = formatResponse(lastMessage);
      const PROMPT = '\r\n> ';
      termInstance.current.writeln(formatted);
      termInstance.current.write(PROMPT);
    }
  }, [lastMessage]);

  return <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />;
}