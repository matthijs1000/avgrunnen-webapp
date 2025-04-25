import { useState } from 'react';
import { db } from './firebaseConfig';
import { ref, runTransaction, get } from 'firebase/database';
import { fetchSceneCards } from './utils/sheetsConfig';

// Add helper function to filter cards by act
const filterCardsByAct = (cards, actNumber) => {
  return cards.filter(card => {
    const actKey = `act${actNumber}`;
    // Convert the act value to boolean, handling both string "TRUE" and boolean true
    const isInAct = String(card[actKey] || '').toUpperCase() === "TRUE" || card[actKey] === true;
    console.log(`🎭 Card ${card.id} in act ${actNumber}:`, isInAct);
    return isInAct;
  });
};

export default function AdminTab({ gameState }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const gameId = localStorage.getItem('gameId');

  const resetSceneCards = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting scene cards reset...');
      const allSheetCards = await fetchSceneCards();
      console.log('📥 Fetched cards from sheet:', allSheetCards);
      
      if (allSheetCards.length === 0) {
        throw new Error('No scene cards found in the sheet');
      }

      // Filter cards for act 1 initially
      const actOneCards = filterCardsByAct(allSheetCards, 1);
      console.log('📥 Act 1 cards:', actOneCards);

      if (actOneCards.length === 0) {
        throw new Error('No cards found for Act 1');
      }

      // Reset everything to initial state
      const resetData = {
        cards: allSheetCards, // Store all cards
        activeCards: actOneCards.map(card => card.id), // Store which cards are active
        hands: {}, // Clear all hands
        played: [], // Initialize as empty array
        currentAct: 1 // Reset to Act 1
      };
      
      console.log('💾 Saving reset data:', resetData);
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game) return game;
        game.sceneCards = resetData;
        return game;
      });
      console.log('✅ Reset complete');
      
      setShowResetConfirm(false);
    } catch (err) {
      console.error('Failed to reset scene cards:', err);
      setError('Kunne ikke tilbakestille scenekortene. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const setAct = async (actNumber) => {
    try {
      await runTransaction(ref(db, `games/${gameId}/sceneCards`), (data) => {
        if (!data) return data;
        
        // Filter cards for the new act
        const activeCards = filterCardsByAct(data.cards, actNumber);
        console.log(`📥 Act ${actNumber} cards:`, activeCards);

        if (activeCards.length === 0) {
          throw new Error(`No cards found for Act ${actNumber}`);
        }

        // Update active cards and current act
        data.activeCards = activeCards.map(card => card.id);
        data.currentAct = actNumber;

        // Clear all hands when changing acts
        data.hands = {};
        
        return data;
      });
    } catch (err) {
      console.error('Failed to set act:', err);
      setError('Kunne ikke sette akten. Prøv igjen.');
    }
  };

  const currentAct = gameState?.sceneCards?.currentAct || 1;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Admin</h2>
      
      {/* Current Act Display */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Nåværende Akt: {currentAct}</h3>
        <div className="flex space-x-2">
          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => setAct(num)}
              className={`px-4 py-2 rounded ${
                currentAct === num
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              disabled={isLoading}
            >
              Sett Akt {num}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Scene Cards */}
      <div className="mt-8">
        <button 
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
          disabled={isLoading}
        >
          {isLoading ? 'Tilbakestiller...' : 'Tilbakestill scenekort'}
        </button>
      </div>

      {/* Logout Button */}
      <div className="mt-4">
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Logg ut
        </button>
      </div>

      {error && (
        <div className="mt-4 text-red-600">
          {error}
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Bekreft tilbakestilling</h3>
            <p className="mb-6 text-gray-600">
              Er du sikker på at du vil tilbakestille scenekortene? Dette vil laste inn kortene på nytt fra Google Sheets.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isLoading}
              >
                Avbryt
              </button>
              <button
                onClick={resetSceneCards}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={isLoading}
              >
                Tilbakestill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 