import { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { ref, runTransaction, get } from 'firebase/database';
import { fetchSceneCards } from './utils/sheetsConfig';

// Add helper function to filter cards by act
const filterCardsByAct = (cards, actNumber) => {
  return cards.filter(card => {
    const actKey = `act ${actNumber}`;
    console.log(`🎭 Card ${card.id} for act key ${actKey}`, card[actKey]);
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
  const [isStarting, setIsStarting] = useState(false);

  // Log turn history when it changes
  useEffect(() => {
    console.log('🎮 Turn History in AdminTab:', {
      exists: Boolean(gameState?.turnHistory),
      length: gameState?.turnHistory?.length || 0,
      turns: gameState?.turnHistory || [],
      gameState: gameState // Log the entire game state for debugging
    });

    // Log each turn's structure
    if (gameState?.turnHistory?.length > 0) {
      console.log('📝 Turn History Structure:');
      gameState.turnHistory.forEach((turn, index) => {
        console.log(`Turn ${index + 1}:`, {
          type: turn.type,
          turn: turn.turn,
          act: turn.act,
          timestamp: turn.timestamp,
          director: turn.director,
          sceneCard: turn.sceneCard,
          dramaCards: turn.dramaCards,
          raw: turn // Log the raw turn object
        });
      });
    }
  }, [gameState?.turnHistory]);

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

  const startGame = async () => {
    if (!gameId) return;
    setIsStarting(true);
    console.log('🎮 Starting game initialization...');
    
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game) {
          console.log('❌ No game found in database');
          return game;
        }

        // Get all players
        const players = Object.keys(game.players || {}).sort();
        console.log('👥 Available players:', players);
        
        if (players.length === 0) {
          console.log('❌ No players found, cannot start game');
          return game;
        }

        // Pick random first director
        const randomIndex = Math.floor(Math.random() * players.length);
        const firstDirector = players[randomIndex];
        console.log('🎲 Random director selection:', {
          totalPlayers: players.length,
          randomIndex,
          selectedDirector: firstDirector,
          allPlayers: players
        });

        // Store the player order for future director rotation
        game.directorOrder = players;
        game.currentDirector = firstDirector;
        game.gameStarted = true;
        game.currentTurn = 1;

        console.log('✅ Game initialized:', {
          directorOrder: game.directorOrder,
          firstDirector: game.currentDirector,
          gameStarted: game.gameStarted,
          currentTurn: game.currentTurn
        });

        return game;
      });
      console.log('🎮 Game successfully started!');
    } catch (error) {
      console.error('❌ Failed to start game:', error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Admin</h2>
      
      {/* Act Selection */}
      <div className="mb-6">
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

      {/* Start Game */}
      <div className="mt-8">
        <button
          onClick={startGame}
          disabled={isStarting}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isStarting ? 'Starter spill...' : 'Start spill'}
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

      {/* Turn Log */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Spillogg</h3>
        <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
          {!gameState?.turnHistory || gameState.turnHistory.length === 0 ? (
            <p className="text-gray-500 text-center">Ingen trekk spilt ennå</p>
          ) : (
            <div className="space-y-4">
              {[...gameState.turnHistory].reverse().map((turn, index) => (
                <div key={turn.timestamp || index} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold">
                      {turn.type === 'act_progression' ? (
                        `Akt ${turn.previousAct} → ${turn.newAct}`
                      ) : (
                        `Runde ${turn.turn} (Akt ${turn.act})`
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(turn.timestamp).toLocaleString('no-NO')}
                    </div>
                  </div>
                  <div className="text-sm space-y-2">
                    {turn.type !== 'act_progression' && (
                      <>
                        <div>
                          <span className="font-medium">Regissør:</span> {turn.director}
                        </div>
                        <div>
                          <span className="font-medium">Scenekort:</span> {turn.sceneCard?.title} 
                          <span className="text-gray-500 ml-1">({turn.sceneCard?.type})</span>
                        </div>
                        {turn.dramaCards?.played?.length > 0 && (
                          <div>
                            <span className="font-medium">Dramakort spilt:</span>
                            <ul className="ml-4 list-disc">
                              {turn.dramaCards.played.map((card, cardIndex) => (
                                <li key={card.timestamp || `${turn.timestamp}-${cardIndex}`}>
                                  {card.title} <span className="text-gray-500">av {card.playedBy}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {turn.dramaCards?.discarded?.length > 0 && (
                          <div>
                            <span className="font-medium">Dramakort forkastet:</span>
                            <ul className="ml-4 list-disc">
                              {turn.dramaCards.discarded.map((card, cardIndex) => (
                                <li key={card.timestamp || `${turn.timestamp}-${cardIndex}`}>
                                  {card.title} <span className="text-gray-500">av {card.discardedBy}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                    {turn.type === 'act_progression' && (
                      <div>
                        <p>Akten er endret fra {turn.previousAct} til {turn.newAct}</p>
                        <p className="text-gray-500 mt-1">{turn.activeCards} nye kort er aktivert</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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