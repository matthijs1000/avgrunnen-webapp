import React from 'react';
/**
 * @param {Object} props
 * @param {Object} props.deckStatus
 * @param {number} props.currentAct
 */
export function DeckStatusBox({ deckStatus, currentAct }) {
  return (
    <div className="fixed bottom-16 left-0 right-0 mx-4">
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-gray-300">
            <span className="font-semibold">Akt:</span> {currentAct}
          </div>
          <div className={`text-gray-300 ${deckStatus.inDeck === 0 ? 'text-red-500 font-bold' : ''}`}>
            <span className="font-semibold">Kort i bunken:</span> {deckStatus.inDeck}
          </div>
          <div className="text-gray-300">
            <span className="font-semibold">Spilte kort:</span> {deckStatus.played}
          </div>
          <div className="text-gray-300">
            <span className="font-semibold">Kort i spillerhender:</span> {deckStatus.inOtherHands}
          </div>
        </div>
      </div>
    </div>
  );
} 