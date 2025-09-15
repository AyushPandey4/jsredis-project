import React, { useState } from 'react';

export function ConnectionPanel({ status, onConnect, onDisconnect,  defaultHost, defaultPort }) {
  const [host, setHost] = useState(defaultHost || 'localhost');
  const [port, setPort] = useState(defaultPort || '8080');

  const handleConnect = (e) => {
    e.preventDefault();
    onConnect(`ws://${host}:${port}`);
  };

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="p-4 border-b border-gray-700">
      <h1 className="text-2xl font-bold text-green-400 mb-4">JSRedis Dashboard</h1>
      <form onSubmit={handleConnect} className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="host">Host:</label>
          <input
            id="host"
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            disabled={isConnected || isConnecting}
            className="bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="port">Port:</label>
          <input
            id="port"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={isConnected || isConnecting}
            className="bg-gray-800 border border-gray-700 rounded p-2 w-24 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          />
        </div>

        {isConnected ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
          >
            Disconnect
          </button>
        ) : (
          <button
            type="submit"
            disabled={isConnecting}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-wait"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span>Status:</span>
          <span className={`w-4 h-4 rounded-full ${
            isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
          }`}></span>
          <span className="capitalize">{status}</span>
        </div>
      </form>
    </div>
  );
}