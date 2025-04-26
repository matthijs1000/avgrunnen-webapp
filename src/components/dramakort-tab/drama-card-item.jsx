import React from 'react';
import { useTheme } from '../../ThemeContext';

/**
 * @param {Object} props
 * @param {Object} props.card
 * @param {boolean} props.isPlaying
 * @param {function} props.onPreview
 * @param {function} props.onDiscard
 */
export function DramaCardItem({ card, isPlaying, onPreview, onDiscard }) {
  const { theme } = useTheme();
  
  // Drama cards have their own distinct style per theme
  const themeStyles = {
    lovecraft: {
      card: 'border-r-4 border-red-900 bg-red-950/25',
      text: 'text-[#e7e5e4]',
      title: 'text-[#e0d6b9]',
    },
    'russia-1984': {
      card: 'border-r-4 border-red-900 bg-red-900/20',
      text: 'text-[#e7e5e4]',
      title: 'text-[#e0d6b9]',
    },
    'norway-1946': {
      card: 'border-r-4 border-red-700 bg-red-100/40',
      text: 'text-[#e7e5e4]',
      title: 'text-[#e0d6b9]',
    },
    'colombia-1972': {
      card: 'border-r-4 border-red-700 bg-red-300/70',
      text: 'text-[#e7e5e4]',
      title: 'text-[#e0d6b9]',
    },
  };

  const styles = themeStyles[theme] || themeStyles.lovecraft;

  return (
    <li className={`${styles.card} mb-4 relative overflow-hidden p-6 rounded-xl shadow-lg text-left`}>
      <div>
        <h3 className={`text-xl font-bold font-cinzel tracking-wide ${styles.title} drop-shadow-lg text-left`}>{card.title}</h3>
      </div>
      {card.text && (
        <p className={`text-base font-garamond ${styles.text} leading-relaxed mb-3 text-left`} style={{textShadow: '0 1px 2px #18181b'}}>
          {card.text.split(/\n/).map((line, idx, arr) => (
            <React.Fragment key={idx}>
              {line}
              {idx < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      )}
      {card.type && (
        <p className="text-sm text-muted-foreground mb-3 text-left">Type: {card.type}</p>
      )}
      <div className="flex justify-end mt-auto">
        <button
          onClick={() => onDiscard(card.id)}
          disabled={isPlaying}
          className="bg-[#2a2323] border border-[#3f2f2f] text-[#e0d6b9] px-4 py-2 rounded font-cinzel tracking-wider shadow hover:bg-[#1b1818] hover:text-[#f5e9c8] hover:border-[#6b4f2b] disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 transition-all duration-200"
        >
          {isPlaying ? 'Forkaster...' : 'Forkast'}
        </button>
        <button
          onClick={() => onPreview(card)}
          disabled={isPlaying}
          className="ml-2 bg-[#23232a] border border-[#3b2f2f] text-[#e0d6b9] px-6 py-2 rounded font-cinzel tracking-wider shadow hover:bg-[#18181b] hover:text-[#f5e9c8] hover:border-[#6b4f2b] disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 transition-all duration-200"
          style={{letterSpacing: '0.08em'}}
        >
          {isPlaying ? 'Spiller...' : 'Spill'}
        </button>
      </div>
      {/* Subtle vignette overlay */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',boxShadow:'0 0 40px 8px #18181b99 inset'}} />
    </li>
  );
} 