import React from 'react';
/**
 * @param {Object} props
 * @param {string} props.type
 */
export function TypeIcon({ type }) {
  const base = 'h-6 w-6 drop-shadow-[0_2px_4px_rgba(20,10,40,0.5)]';
  switch (type?.toLowerCase()) {
    case 'relationship':
      // Intertwined tentacles
      return (
        <div className="flex items-center text-pink-900" title="Relasjonsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className={base} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21c-4-2-7-5-7-9a7 7 0 0 1 14 0c0 4-3 7-7 9z" opacity=".7"/>
            <path d="M8 13c0-2 2-4 4-4s4 2 4 4" stroke="#a21caf" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
      );
    case 'goal':
      // Arcane eye
      return (
        <div className="flex items-center text-yellow-900" title="Målscene">
          <svg xmlns="http://www.w3.org/2000/svg" className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <ellipse cx="12" cy="12" rx="9" ry="6" fill="#facc15" fillOpacity="0.15" stroke="#a16207" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="2.5" fill="#a16207" />
            <circle cx="12" cy="12" r="1.2" fill="#fde68a" />
          </svg>
        </div>
      );
    case 'breathing':
      return (
        <div className="flex items-center text-blue-400" title="Pustescene">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a8 8 0 100 16zm0 14a6 6 0 110-12 6 6 0 010 12zm0-9a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'development':
      // Ancient rune
      return (
        <div className="flex items-center text-green-900" title="Utviklingsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 3v18M6 9l6 6 6-6" stroke="#166534" strokeWidth="1.5" fill="none"/>
            <circle cx="12" cy="12" r="10" stroke="#166534" strokeWidth="1" fill="#bbf7d0" fillOpacity="0.08"/>
          </svg>
        </div>
      );
    case 'exploration':
      // Alien star
      return (
        <div className="flex items-center text-purple-900" title="Utforskningsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className={base} viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 15,11 24,11 17,17 19,24 12,20 5,24 7,17 0,11 9,11" fill="#a78bfa" fillOpacity="0.18" stroke="#6d28d9" strokeWidth="1.2"/>
            <circle cx="12" cy="12" r="2" fill="#6d28d9" />
          </svg>
        </div>
      );
    case 'plan':
      // Occult triangle
      return (
        <div className="flex items-center text-orange-900" title="Planleggingsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className={base} viewBox="0 0 24 24" fill="none">
            <polygon points="12,4 22,20 2,20" fill="#fdba74" fillOpacity="0.13" stroke="#ea580c" strokeWidth="1.2"/>
            <circle cx="12" cy="15" r="2" fill="#ea580c" />
          </svg>
        </div>
      );
    case 'change':
      // Tentacled spiral
      return (
        <div className="flex items-center text-indigo-900" title="Endringsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className={base} viewBox="0 0 24 24" fill="none">
            <path d="M12 12c4-4 8 4 4 8s-12 0-8-8 8-8 8-8" stroke="#3730a3" strokeWidth="1.5" fill="none"/>
            <circle cx="12" cy="12" r="2" fill="#6366f1" fillOpacity="0.18" />
          </svg>
        </div>
      );
    default:
      // Unknowable glyph
      return (
        <div className="flex items-center text-gray-700" title="Annen type scene">
          <svg xmlns="http://www.w3.org/2000/svg" className={base} viewBox="0 0 24 24" fill="none">
            <path d="M4 20c4-8 12-8 16 0M4 4c4 8 12 8 16 0" stroke="#44403c" strokeWidth="1.2" fill="none"/>
            <circle cx="12" cy="12" r="2" fill="#a3a3a3" fillOpacity="0.18" />
          </svg>
        </div>
      );
  }
} 