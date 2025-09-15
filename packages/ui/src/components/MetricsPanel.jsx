import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function MetricsPanel({ metrics, history }) {
  const { memory, clients, tps } = metrics;

  return (
    <div className="flex flex-col h-full gap-4">
      <h2 className="text-lg font-semibold text-gray-300">Live Metrics</h2>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-900 p-3 rounded-md">
          <div className="text-2xl font-bold text-cyan-400">{tps}</div>
          <div className="text-xs text-gray-400">Commands/sec</div>
        </div>
        <div className="bg-gray-900 p-3 rounded-md">
          <div className="text-2xl font-bold text-cyan-400">{clients.tcp + clients.ws}</div>
          <div className="text-xs text-gray-400">Connected Clients</div>
        </div>
        <div className="bg-gray-900 p-3 rounded-md">
          <div className="text-2xl font-bold text-cyan-400">{memory.heapUsed} <span className="text-lg">MB</span></div>
          <div className="text-xs text-gray-400">Heap Used</div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
            <XAxis dataKey="time" stroke="#a0aec0" fontSize={12} />
            <YAxis stroke="#a0aec0" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#2d3748', border: 'none' }} />
            <Legend />
            <Line type="monotone" dataKey="tps" name="Commands/sec" stroke="#38b2ac" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="memory" name="Heap (MB)" stroke="#9f7aea" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}