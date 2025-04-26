import React from 'react';
import { TypeIcon } from './type-icon';
import { useTheme } from '../../ThemeContext';
/**
 * @param {Object} props
 * @param {Object} props.card
 * @param {Object} props.playerCharacters
 * @param {boolean} props.isPlaying
 * @param {boolean} props.canPlay
 * @param {function} props.onPlay
 */
export function SceneCardItem({ card, playerCharacters, isPlaying, canPlay, onPlay }) {
  const { theme } = useTheme();
  // Map scene types to color and style for each theme
  const themeTypeStyles = {
    lovecraft: {
      relationship: 'border-l-4 border-pink-900 bg-pink-400/25',
      goal: 'border-l-4 border-yellow-900 bg-yellow-300/25',
      exploration: 'border-l-4 border-purple-900 bg-purple-400/25',
      development: 'border-l-4 border-green-900 bg-green-400/25',
      change: 'border-l-4 border-indigo-900 bg-indigo-400/25',
      plan: 'border-l-4 border-orange-900 bg-orange-300/25',
      default: 'border-l-4 border-gray-800 bg-gray-700/25',
    },
    'russia-1984': {
      relationship: 'border-l-4 border-red-900 bg-red-400/20',
      goal: 'border-l-4 border-blue-900 bg-blue-300/20',
      exploration: 'border-l-4 border-gray-700 bg-gray-400/20',
      development: 'border-l-4 border-green-800 bg-green-300/20',
      change: 'border-l-4 border-yellow-900 bg-yellow-200/20',
      plan: 'border-l-4 border-orange-900 bg-orange-300/20',
      default: 'border-l-4 border-gray-800 bg-gray-300/20',
    },
    'norway-1946': {
      relationship: 'border-l-4 border-green-700 bg-green-200/40',
      goal: 'border-l-4 border-blue-900 bg-blue-100/40',
      exploration: 'border-l-4 border-yellow-700 bg-yellow-100/40',
      development: 'border-l-4 border-gray-700 bg-gray-200/40',
      change: 'border-l-4 border-indigo-700 bg-indigo-100/40',
      plan: 'border-l-4 border-orange-700 bg-orange-100/40',
      default: 'border-l-4 border-gray-400 bg-gray-100/40',
    },
    'colombia-1972': {
      relationship: 'border-l-4 border-green-700 bg-green-300/70',
      goal:        'border-l-4 border-yellow-700 bg-yellow-300/70',
      exploration: 'border-l-4 border-blue-700 bg-blue-300/70',
      development: 'border-l-4 border-orange-700 bg-orange-300/70',
      change:      'border-l-4 border-pink-700 bg-pink-300/70',
      plan:        'border-l-4 border-purple-700 bg-purple-300/70',
      default:     'border-l-4 border-gray-400 bg-gray-100/70',
    },
  };
  // Normalize type
  const typeKey = (card.type || '').toLowerCase().trim();
  const typeStyles = themeTypeStyles[theme] || themeTypeStyles.lovecraft;
  const cardStyle = typeStyles[typeKey] || typeStyles.default;

  return (
    <li key={card.id} className={`lovecraft-card ${cardStyle} mb-4 relative overflow-hidden p-6 rounded-xl shadow-lg`}>
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