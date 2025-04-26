import React from 'react';
/**
 * @param {Object} props
 * @param {Object} props.deckStatus
 * @param {number} props.currentAct
 */
export function DeckStatusBox({ deckStatus, currentAct }) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-gray-800 rounded-lg p-3 shadow-lg flex flex-col items-center space-y-2 min-w-[48px]">
        {/* Deck (Kort i bunken) */}
        <div className={`text-gray-300 flex items-center ${deckStatus.inDeck === 0 ? 'text-red-500 font-bold' : ''}`}>
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M7 4v16" stroke="currentColor" strokeWidth="2"/></svg>
          <span>{deckStatus.inDeck}</span>
        </div>
        {/* Played (Spilte kort) */}
        <div className="text-gray-300 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21 5,3" fill="currentColor" /></svg>
          <span>{deckStatus.played}</span>
        </div>
        {/* In other hands (Kort i spillerhender) */}
        <div className="text-gray-300 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M12 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h2"/><path d="M17 17v2a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-2"/></svg>
          <span>{deckStatus.inOtherHands}</span>
        </div>
      </div>
    </div>
  );
} 