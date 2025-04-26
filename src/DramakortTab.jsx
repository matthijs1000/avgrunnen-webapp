import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { ref, runTransaction, get, set, onValue } from 'firebase/database';
import { fetchDramaCards } from './utils/sheetsConfig';
import { shuffleArray, getAvailableDramaCards, getPlayedDramaCardIds } from './components/dramakort-tab/helpers';
import { DramaCardItem } from './components/dramakort-tab/drama-card-item';

const HAND_SIZE = 5;

export default function DramakortTab({ gameState }) {
  const [hand, setHand] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actioningCards, setActioningCards] = useState(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);

  const playerName = localStorage.getItem('name');
  const gameId = localStorage.getItem('gameId');
  const character = localStorage.getItem('character');

  // Initialize game if needed
  const initializeGameIfNeeded = async () => {
    try {
      const gameSnapshot = await get(ref(db, `games/${gameId}`));
      const game = gameSnapshot.val();
      
      if (!game?.dramaCards?.cards) {
        console.log('🎲 Initializing drama cards...');
        // Fetch cards from Google Sheets
        const sheetCards = await fetchDramaCards();
        if (!sheetCards || sheetCards.length === 0) {
          throw new Error('No drama cards found in the sheet');
        }
        
        await set(ref(db, `games/${gameId}/dramaCards`), {
          cards: sheetCards,
          hands: {},
          played: {}
        });
        console.log('🎲 Initialized drama cards from sheet');
      }
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize drama cards:', err);
      setError('Kunne ikke laste dramakortene. Sjekk internett-tilkoblingen.');
    }
  };

  // Initial setup
  useEffect(() => {
    if (!playerName || !gameId) return;
    
    const setup = async () => {
      try {
        await initializeGameIfNeeded();
        
        // Check if hand needs filling
        const handRef = ref(db, `games/${gameId}/dramaCards/hands/${playerName}`);
        const handSnap = await get(handRef);
        const currentHand = handSnap.val() || [];
        
        if (!Array.isArray(currentHand) || currentHand.length < HAND_SIZE) {
          console.log('🎴 Filling initial hand...');
          await fillHand();
        }
      } catch (err) {
        console.error('Setup failed:', err);
        setError(err.message);
      }
    };

    setup();
  }, [playerName, gameId]);

  // Update hand when gameState changes
  useEffect(() => {
    if (!gameState || !playerName || !isInitialized) return;

    const playerHand = gameState.dramaCards?.hands?.[playerName] || [];
    console.log('📥 Current drama cards hand:', playerHand.length);
    setHand(playerHand);

    // Auto-fill hand if needed
    if (playerHand.length < HAND_SIZE) {
      console.log('🎴 Hand needs', HAND_SIZE - playerHand.length, 'more cards, filling...');
      fillHand();
    }
  }, [gameState, playerName, isInitialized]);

  const fillHand = async () => {
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game?.dramaCards?.cards) {
          console.warn('🚫 No drama cards available');
          return game;
        }

        const allCards = game.dramaCards.cards || [];
        const allHands = game.dramaCards.hands || {};
        
        // Get current hand
        const currentHand = Array.isArray(allHands[playerName]) ? allHands[playerName] : [];
        const cardsNeeded = HAND_SIZE - currentHand.length;

        if (cardsNeeded <= 0) {
          console.log('✋ Hand is already full');
          return game;
        }

        // Get all cards that are currently in hands
        const playedCards = new Set(
          Object.values(allHands)
            .flat()
            .map(card => card.id)
        );

        // Find available cards
        const availableCards = allCards.filter(card => !playedCards.has(card.id));
        console.log('�� Available cards:', availableCards.length);

        if (availableCards.length === 0) {
          console.warn('🚫 No cards available');
          return game;
        }

        // Shuffle available cards
        for (let i = availableCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableCards[i], availableCards[j]] = [availableCards[j], availableCards[i]];
        }

        // Draw cards
        const newCards = availableCards.slice(0, cardsNeeded);
        console.log('🎴 Drew cards:', newCards.map(c => c.title).join(', '));

        // Initialize hands if needed
        if (!game.dramaCards.hands) {
          game.dramaCards.hands = {};
        }

        // Update hand
        game.dramaCards.hands[playerName] = [...currentHand, ...newCards];
        return game;
      });
    } catch (err) {
      console.error('Failed to fill hand:', err);
      setError('Kunne ikke fylle hånden. Prøv igjen.');
    }
  };

  const playCard = async (cardId) => {
    setActioningCards(prev => new Set([...prev, cardId]));
    try {
      console.log('🎭 Starting to play drama card:', cardId);
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game?.dramaCards?.hands?.[playerName]) {
          console.warn('❌ No drama cards hand found for player:', playerName);
          return game;
        }

        const currentHand = game.dramaCards.hands[playerName];
        const playedCard = currentHand.find(c => c.id === cardId);
        
        if (!playedCard) {
          console.warn('❌ Card not found in hand:', cardId);
          return game;
        }

        console.log('📝 Found card to play:', playedCard);

        // Create a deep copy of the game state to modify
        const updatedGame = JSON.parse(JSON.stringify(game));

        // Remove card from hand
        updatedGame.dramaCards.hands[playerName] = currentHand.filter(c => c.id !== cardId);

        // Initialize played object if it doesn't exist
        if (!updatedGame.dramaCards.played) {
          updatedGame.dramaCards.played = {};
        }

        // Add to played cards history
        const timestamp = Date.now();
        const playedObj = {
          id: playedCard.id,
          title: playedCard.title,
          playedBy: playerName,
          timestamp
        };
        if (playedCard.type !== undefined) playedObj.type = playedCard.type;
        updatedGame.dramaCards.played[timestamp] = playedObj;

        console.log('🎲 Current turn history:', updatedGame.turnHistory);
        // Update current turn's drama cards history
        if (updatedGame.turnHistory && updatedGame.turnHistory.length > 0) {
          const currentTurn = updatedGame.turnHistory[updatedGame.turnHistory.length - 1];
          console.log('📝 Adding drama card to current turn:', currentTurn.turn);
          
          // Initialize arrays if they don't exist
          if (!currentTurn.dramaCards) {
            currentTurn.dramaCards = { played: [], discarded: [] };
          }
          if (!Array.isArray(currentTurn.dramaCards.played)) {
            currentTurn.dramaCards.played = [];
          }
          
          currentTurn.dramaCards.played.push(playedObj);
          
          console.log('✅ Updated turn history:', {
            turn: currentTurn.turn,
            dramaCardsPlayed: currentTurn.dramaCards.played.length
          });
        } else {
          console.warn('⚠️ No current turn found in turn history');
        }

        console.log('🔄 Returning updated game state with drama cards:', {
          playedCardsCount: Object.keys(updatedGame.dramaCards.played).length,
          turnHistoryLength: updatedGame.turnHistory?.length,
          lastTurnDramaCards: updatedGame.turnHistory?.[updatedGame.turnHistory.length - 1]?.dramaCards
        });

        return updatedGame;
      });

      // Verify the write
      const gameSnapshot = await get(ref(db, `games/${gameId}`));
      const updatedGame = gameSnapshot.val();
      const lastTurn = updatedGame.turnHistory?.[updatedGame.turnHistory.length - 1];
      console.log('✅ Turn log verification:', {
        turnHistoryExists: Boolean(updatedGame.turnHistory),
        lastTurnNumber: lastTurn?.turn,
        dramaCardsInLastTurn: lastTurn?.dramaCards?.played?.length || 0,
        totalPlayedDramaCards: Object.keys(updatedGame.dramaCards?.played || {}).length
      });

      // Draw a new card
      await fillHand();
    } catch (err) {
      console.error('❌ Failed to play card:', err);
      setError('Kunne ikke spille kortet. Prøv igjen.');
    } finally {
      setActioningCards(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  const discardCard = async (cardId) => {
    setActioningCards(prev => new Set([...prev, cardId]));
    try {
      console.log('🗑️ Starting to discard drama card:', cardId);
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game?.dramaCards?.hands?.[playerName]) {
          console.warn('❌ No drama cards hand found for player:', playerName);
          return game;
        }

        const currentHand = game.dramaCards.hands[playerName];
        const discardedCard = currentHand.find(c => c.id === cardId);
        
        if (!discardedCard) {
          console.warn('❌ Card not found in hand:', cardId);
          return game;
        }

        console.log('📝 Found card to discard:', discardedCard);

        // Create a deep copy of the game state to modify
        const updatedGame = JSON.parse(JSON.stringify(game));

        // Remove card from hand
        updatedGame.dramaCards.hands[playerName] = currentHand.filter(c => c.id !== cardId);

        // Initialize discarded array if it doesn't exist
        if (!updatedGame.dramaCards.discarded) {
          updatedGame.dramaCards.discarded = [];
        }

        const timestamp = Date.now();
        // Add to discard history
        const discardedObj = {
          id: discardedCard.id,
          title: discardedCard.title,
          discardedBy: playerName,
          timestamp
        };
        if (discardedCard.type !== undefined) discardedObj.type = discardedCard.type;
        updatedGame.dramaCards.discarded.push(discardedObj);

        console.log('🎲 Current turn history:', updatedGame.turnHistory);
        // Update current turn's drama cards history
        if (updatedGame.turnHistory && updatedGame.turnHistory.length > 0) {
          const currentTurn = updatedGame.turnHistory[updatedGame.turnHistory.length - 1];
          console.log('📝 Adding discarded drama card to current turn:', currentTurn.turn);
          
          // Initialize arrays if they don't exist
          if (!currentTurn.dramaCards) {
            currentTurn.dramaCards = { played: [], discarded: [] };
          }
          if (!Array.isArray(currentTurn.dramaCards.discarded)) {
            currentTurn.dramaCards.discarded = [];
          }
          
          currentTurn.dramaCards.discarded.push(discardedObj);
          
          console.log('✅ Updated turn history:', {
            turn: currentTurn.turn,
            dramaCardsDiscarded: currentTurn.dramaCards.discarded.length
          });
        } else {
          console.warn('⚠️ No current turn found in turn history');
        }

        console.log('🔄 Returning updated game state with discarded cards:', {
          discardedCardsCount: updatedGame.dramaCards.discarded.length,
          turnHistoryLength: updatedGame.turnHistory?.length,
          lastTurnDramaCards: updatedGame.turnHistory?.[updatedGame.turnHistory.length - 1]?.dramaCards
        });

        return updatedGame;
      });

      // Verify the write
      const gameSnapshot = await get(ref(db, `games/${gameId}`));
      const updatedGame = gameSnapshot.val();
      const lastTurn = updatedGame.turnHistory?.[updatedGame.turnHistory.length - 1];
      console.log('✅ Turn log verification:', {
        turnHistoryExists: Boolean(updatedGame.turnHistory),
        lastTurnNumber: lastTurn?.turn,
        dramaCardsInLastTurn: lastTurn?.dramaCards?.discarded?.length || 0,
        totalDiscardedDramaCards: updatedGame.dramaCards?.discarded?.length || 0
      });

      // Draw a new card
      await fillHand();
    } catch (err) {
      console.error('❌ Failed to discard card:', err);
      setError('Kunne ikke forkaste kortet. Prøv igjen.');
    } finally {
      setActioningCards(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  function handlePreview(card) {
    console.log('[DramakortTab] Preview requested for card:', card);
    setPreviewCard(card);
  }

  function handleCancelPreview() {
    console.log('[DramakortTab] Preview cancelled');
    setPreviewCard(null);
  }

  async function handleConfirmPreview() {
    if (previewCard) {
      console.log('[DramakortTab] Confirm play for card:', previewCard);
      await playCard(previewCard.id);
      setPreviewCard(null);
    }
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 text-blue-600 underline"
        >
          Last siden på nytt
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 relative">
      <div className={previewCard ? 'blur-sm pointer-events-none select-none' : ''}>
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Dramakort ({hand.length}/{HAND_SIZE})</h2>
        </div>
        <ul className="space-y-4">
          {hand.map((card) => (
            <DramaCardItem
              key={card.id}
              card={card}
              isPlaying={actioningCards.has(card.id)}
              onPreview={handlePreview}
              onDiscard={discardCard}
            />
          ))}
        </ul>
      </div>
      {previewCard && (
        <>
          {console.log('[DramakortTab] Preview modal open for card:', previewCard)}
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
              <h3 className="text-2xl font-bold mb-4">{previewCard.title}</h3>
              {previewCard.text && (
                <p className="text-lg text-gray-700 mb-6">{previewCard.text}</p>
              )}
              {previewCard.type && (
                <p className="text-base text-gray-500 mb-6">Type: {previewCard.type}</p>
              )}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={handleCancelPreview}
                  className="px-6 py-2 rounded bg-gray-300 text-gray-800 hover:bg-gray-400"
                >
                  Angre
                </button>
                <button
                  onClick={handleConfirmPreview}
                  className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  disabled={actioningCards.has(previewCard.id)}
                >
                  {actioningCards.has(previewCard.id) ? 'Spiller...' : 'Fortsett'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 