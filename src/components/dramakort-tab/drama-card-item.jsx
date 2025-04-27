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
  const isLightTheme = theme === 'norway-1946' || theme === 'colombia-1972';
  
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
    <li className={`theme-${theme} mb-4 relative overflow-hidden p-6 rounded-xl shadow-lg text-left`}
        style={{
          backgroundColor: 'var(--drama-card-bg)',
          borderRight: '4px solid var(--drama-card-border)',
          boxShadow: '0 4px 6px -1px var(--theme-shadow), 0 2px 4px -2px var(--theme-shadow)'
        }}>
      <div>
        <h3 className="text-xl font-bold tracking-wide drop-shadow-lg text-left"
            style={{ 
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-heading)'
            }}>
          {card.title}
        </h3>
      </div>
      {card.text && (
        <p className="text-base leading-relaxed mb-3 text-left"
           style={{
             fontFamily: 'var(--font-body)',
             color: 'var(--text-main)',
             textShadow: isLightTheme ? 'none' : '0 1px 2px rgba(0,0,0,0.2)'
           }}>
          {card.text.split(/\n/).map((line, idx, arr) => (
            <React.Fragment key={idx}>
              {line}
              {idx < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      )}
      {card.type && (
        <p className="text-sm mb-3 text-left" style={{ color: 'var(--text-main)', opacity: 0.8 }}>
          Type: {card.type}
        </p>
      )}
      <div className="flex justify-end mt-auto gap-2">
        <button
          onClick={() => onDiscard(card.id)}
          disabled={isPlaying}
          className="px-4 py-2 rounded tracking-wider shadow transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
          style={{
            backgroundColor: 'var(--button-bg)',
            borderColor: 'var(--button-border)',
            color: 'var(--button-text)',
            border: '1px solid var(--button-border)',
            fontFamily: 'var(--font-heading)',
          }}
        >
          {isPlaying ? 'Forkaster...' : 'Forkast'}
        </button>
        <button
          onClick={() => onPreview(card)}
          disabled={isPlaying}
          className="px-6 py-2 rounded tracking-wider shadow transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
          style={{
            backgroundColor: 'var(--button-bg)',
            borderColor: 'var(--button-border)',
            color: 'var(--button-text)',
            border: '1px solid var(--button-border)',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.08em'
          }}
        >
          {isPlaying ? 'Spiller...' : 'Spill'}
        </button>
      </div>
      {/* Subtle vignette overlay only for dark themes */}
      {!isLightTheme && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow: '0 0 40px 8px rgba(0,0,0,0.4) inset'
        }} />
      )}
    </li>
  );
} 