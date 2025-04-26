import React from 'react';
import { TypeIcon } from './type-icon';
/**
 * @param {Object} props
 * @param {Object} props.card
 * @param {Object} props.playerCharacters
 * @param {boolean} props.isPlaying
 * @param {boolean} props.canPlay
 * @param {function} props.onPlay
 */
export function SceneCardItem({ card, playerCharacters, isPlaying, canPlay, onPlay }) {
  return (
    <li key={card.id} className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white">{card.title}</h3>
        <TypeIcon type={card.type} />
      </div>
      {card.text && (
        <p className="text-sm text-gray-300 leading-relaxed mb-3">{card.text}</p>
      )}
      {card.image && (
        <div className="mb-3 rounded-md overflow-hidden shadow-sm">
          <img
            src={card.image}
            alt={card.title}
            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
            onError={e => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex flex-col space-y-2">
        {card.playerId && (() => {
          const characterName = playerCharacters[card.playerId.toLowerCase()];
          return characterName && (
            <div className="text-sm text-gray-400 text-right italic">
              Eies av: {characterName}
            </div>
          );
        })()}
        <div className="flex justify-end">
          <button
            onClick={() => onPlay(card.id)}
            disabled={isPlaying || !canPlay}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isPlaying ? 'Spiller...' : 'Spill'}
          </button>
        </div>
      </div>
    </li>
  );
} 