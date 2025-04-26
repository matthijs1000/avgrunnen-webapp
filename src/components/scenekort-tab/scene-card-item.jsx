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
  // Map scene types to color and style
  const typeStyles = {
    relationship: 'border-l-4 border-pink-900 bg-pink-950/60',
    goal: 'border-l-4 border-yellow-900 bg-yellow-950/60',
    exploration: 'border-l-4 border-purple-900 bg-purple-950/60',
    development: 'border-l-4 border-green-900 bg-green-950/60',
    change: 'border-l-4 border-indigo-900 bg-indigo-950/60',
    plan: 'border-l-4 border-orange-900 bg-orange-950/60',
    default: 'border-l-4 border-gray-800 bg-gray-900/60',
  };
  // Normalize type
  const typeKey = (card.type || '').toLowerCase().trim();
  const cardStyle = typeStyles[typeKey] || typeStyles.default;

  return (
    <li key={card.id} className={`lovecraft-card ${cardStyle} mb-4 relative overflow-hidden p-6`} style={{
      backgroundImage: "url('https://www.transparenttextures.com/patterns/old-mat.png')",
      backgroundBlendMode: 'multiply',
      borderRadius: '0.75rem',
      borderWidth: '2px',
      borderColor: '#3b2f2f',
      boxShadow: '0 4px 32px 0 rgba(40, 20, 60, 0.25), 0 0 0 8px rgba(30, 20, 40, 0.08) inset',
    }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold font-cinzel tracking-wide text-[#e0d6b9] drop-shadow-lg">{card.title}</h3>
        <TypeIcon type={card.type} />
      </div>
      {card.text && (
        <p className="text-base font-garamond text-[#e7e5e4] leading-relaxed mb-3" style={{textShadow: '0 1px 2px #18181b'}}> {card.text}</p>
      )}
      {card.image && (
        <div className="mb-3 rounded-md overflow-hidden shadow-sm">
          <img
            src={card.image}
            alt={card.title}
            className="w-full h-48 object-cover grayscale contrast-125 opacity-90 hover:scale-105 transition-transform duration-200 border border-gray-800"
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
              Rolle: {characterName}
            </div>
          );
        })()}
        <div className="flex justify-end">
          <button
            onClick={() => onPlay(card.id)}
            disabled={isPlaying || !canPlay}
            className="bg-[#23232a] border border-[#3b2f2f] text-[#e0d6b9] px-6 py-2 rounded font-cinzel tracking-wider shadow hover:bg-[#18181b] hover:text-[#f5e9c8] hover:border-[#6b4f2b] disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 transition-all duration-200"
            style={{letterSpacing: '0.08em'}}
          >
            {isPlaying ? 'Spiller...' : 'Spill'}
          </button>
        </div>
      </div>
      {/* Subtle vignette overlay for extra creepiness */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',boxShadow:'0 0 40px 8px #18181b99 inset'}} />
    </li>
  );
} 