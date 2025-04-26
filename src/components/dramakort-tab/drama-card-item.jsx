import React from 'react';
/**
 * @param {Object} props
 * @param {Object} props.card
 * @param {boolean} props.isPlaying
 * @param {function} props.onPreview
 * @param {function} props.onDiscard
 */
export function DramaCardItem({ card, isPlaying, onPreview, onDiscard }) {
  return (
    <li className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-2">{card.title}</h3>
      {card.text && (
        <p className="text-sm text-gray-600 mb-3">
          {card.text.split(/\n/).map((line, idx, arr) => (
            <React.Fragment key={idx}>
              {line}
              {idx < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      )}
      {card.type && (
        <p className="text-sm text-gray-500 mb-3">Type: {card.type}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onPreview(card)}
          disabled={isPlaying}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPlaying ? 'Spiller...' : 'Spill'}
        </button>
        <button
          onClick={() => onDiscard(card.id)}
          disabled={isPlaying}
          className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {isPlaying ? 'Forkaster...' : 'Forkast'}
        </button>
      </div>
    </li>
  );
} 