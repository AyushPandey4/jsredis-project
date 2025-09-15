import React, { useState } from "react";

export function KeyBrowser({ keys, onKeyClick }) {
  const [filter, setFilter] = useState("");

  const filteredKeys = keys.filter((key) =>
    key.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-2 text-gray-300">
        Key Browser ({keys.length})
      </h2>
      <input
        type="text"
        placeholder="Filter keys..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <div className="flex-grow overflow-y-auto border border-gray-700 rounded">
        {filteredKeys.map((key) => (
          <div
            key={key}
            className="p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
            onClick={() => onKeyClick(key)}
          >
            {key}
          </div>
        ))}
        {keys.length === 0 && (
          <div className="p-2 text-gray-500">No keys in store.</div>
        )}
      </div>
    </div>
  );
}
