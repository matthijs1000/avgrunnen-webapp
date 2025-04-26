import React from 'react';
/**
 * @param {Object} props
 * @param {number} props.currentAct
 * @param {boolean} props.isLoading
 * @param {(act: number) => void} props.onSetAct
 */
export function ActSelector({ currentAct, isLoading, onSetAct }) {
  return (
    <div className="mb-6">
      <div className="flex space-x-2">
        {[1, 2, 3].map(num => (
          <button
            key={num}
            onClick={() => onSetAct(num)}
            className={`px-4 py-2 rounded ${currentAct === num ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            disabled={isLoading}
          >
            Sett Akt {num}
          </button>
        ))}
      </div>
    </div>
  );
} 