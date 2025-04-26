import { useEffect, useState } from 'react';
import { db } from './firebaseConfig';
import {
  ref,
  get,
  set,
  runTransaction,
  child,
  push,
  onValue,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';
import { fetchDramaCards } from './utils/sheetsConfig';

const HAND_SIZE = 5;
const NOTIFICATION_LIMIT = 10; // Increased limit since we'll have more space

export default function KortTabFirebase({ gameState }) {
  const [hand, setHand] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [deckStatus, setDeckStatus] = useState({ total: 0, available: 0, discarded: 0 });
  const [actioningCards, setActioningCards] = useState(new Set());
  const [currentView, setCurrentView] = useState('hand'); // 'hand' or 'notifications'
  const [touchStart, setTouchStart] = useState(null);
  const [newNotificationIds, setNewNotificationIds] = useState(new Set());
  const [isRegistered, setIsRegistered] = useState(false);

  const playerName = localStorage.getItem('name');
  const gameId = localStorage.getItem('gameId');
  const character = localStorage.getItem('character');

  
  // Add player registration check
  useEffect(() => {
    if (!playerName || !gameId) return;

    const checkRegistration = async () => {
      try {
        const playerRef = ref(db, `games/${gameId}/players/${playerName}`);
        const snapshot = await get(playerRef);
        
        if (!snapshot.exists()) {
          // Player not registered, register them
          await set(playerRef, {
            character: character || playerName // Fallback to playerName if no character
          });
          console.log('🎭 Registered player:', playerName);
        }
        setIsRegistered(true);
      } catch (err) {
        console.error('Failed to check/create player registration:', err);
        setError('Kunne ikke registrere spilleren. Prøv å laste siden på nytt.');
      }
    };

    checkRegistration();
  }, [playerName, gameId, character]);

  // Subscribe to played cards notifications
  useEffect(() => {
    const playedRef = query(
      ref(db, `games/${gameId}/played`),
      orderByChild('timestamp'),
      limitToLast(NOTIFICATION_LIMIT)
    );

    const unsubscribe = onValue(playedRef, (snapshot) => {
      const played = snapshot.val();
      if (played) {
        const notificationsList = Object.values(played)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, NOTIFICATION_LIMIT);
        
        // Mark new notifications
        const currentIds = new Set(notifications.map(n => n.timestamp));
        const newIds = new Set(
          notificationsList
            .filter(n => !currentIds.has(n.timestamp))
            .map(n => n.timestamp)
        );
        
        setNewNotificationIds(newIds);
        setNotifications(notificationsList);

        // Clear "new" status after 2 seconds
        if (newIds.size > 0) {
          setTimeout(() => {
            setNewNotificationIds(prev => {
              const updated = new Set(prev);
              newIds.forEach(id => updated.delete(id));
              return updated;
            });
          }, 2000);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // Handle touch events for swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;

    const currentTouch = e.touches[0].clientX;
    const diff = touchStart - currentTouch;

    // Require at least 50px swipe
    if (Math.abs(diff) > 50) {
      setCurrentView(diff > 0 ? 'notifications' : 'hand');
      setTouchStart(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  // Initialize game if needed
  const initializeGameIfNeeded = async () => {
    try {
      console.log('🎲 Starting drama cards initialization...');
      const gameSnapshot = await get(ref(db, `games/${gameId}`));
      
      // If game doesn't exist or doesn't have dramaCards, initialize it
      if (!gameSnapshot.exists() || !gameSnapshot.val().dramaCards) {
        console.log('🎴 No drama cards found, fetching from sheet...');
        // Fetch cards from Google Sheets
        const sheetCards = await fetchDramaCards();
        if (sheetCards.length === 0) {
          throw new Error('No drama cards found in the sheet');
        }
        
        // If game exists but just missing dramaCards, only set dramaCards
        if (gameSnapshot.exists()) {
          await set(ref(db, `games/${gameId}/dramaCards`), {
            cards: sheetCards,
            hands: {},
            played: {}
          });
        } else {
          // If game doesn't exist at all, create full structure
          await set(ref(db, `games/${gameId}`), {
            dramaCards: {
              cards: sheetCards,
              hands: {},
              played: {}
            },
            players: {}
          });
        }
        console.log('✅ Drama cards initialized with', sheetCards.length, 'cards');
      }
    } catch (err) {
      console.error('Failed to initialize drama cards:', err);
      setError('Kunne ikke koble til spillet. Sjekk internett-tilkoblingen.');
    }
  };

  // Update hand when gameState changes
  useEffect(() => {
    if (!gameState || !playerName) return;

    const playerHand = gameState.dramaCards?.hands?.[playerName] || [];
    console.log('📥 Current drama cards hand:', playerHand.length);
    setHand(playerHand);

    // Auto-fill hand if needed
    if (playerHand.length < HAND_SIZE) {
      console.log('🎴 Hand needs', HAND_SIZE - playerHand.length, 'more cards, filling...');
      fillHand();
    }
  }, [gameState, playerName]);

  const fillHand = async () => {
    try {
      console.log('🎲 Starting fillHand operation...');
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        console.log('🔍 Current game state:', game);
        if (!game || !game.dramaCards) {
          console.warn('❌ No game or dramaCards found in database');
          return game;
        }

        // Initialize hands if it doesn't exist
        if (!game.dramaCards.hands) {
          game.dramaCards.hands = {};
        }

        // Initialize player's hand if it doesn't exist
        if (!game.dramaCards.hands[playerName]) {
          game.dramaCards.hands[playerName] = [];
        }

        const allCards = game.dramaCards.cards || [];
        
        // Get current hand
        const currentHand = game.dramaCards.hands[playerName];
        const cardsNeeded = HAND_SIZE - currentHand.length;
        
        if (cardsNeeded <= 0) {
          return game;
        }

        // Get all cards that are currently in hands
        const playedCards = new Set(
          Object.values(game.dramaCards.hands)
            .flat()
            .map(card => card.id)
        );
        console.log('🎭 Cards in hands:', [...playedCards]);

        // Find available cards
        const availableCards = allCards.filter(card => !playedCards.has(card.id));
        console.log('📊 Available cards:', availableCards.length);
        console.log('🃏 Available card IDs:', availableCards.map(c => c.id));

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
        console.log('🎴 Drew cards:', newCards.map(c => ({ id: c.id, title: c.title })));

        // Update hand
        game.dramaCards.hands[playerName] = [...currentHand, ...newCards];
        console.log('✅ Updated hand:', game.dramaCards.hands[playerName]);
        return game;
      });
      
    } catch (err) {
      console.error('❌ Failed to fill hand:', err);
      setError('Kunne ikke fylle hånden. Prøv igjen.');
    }
  };

  const playCard = async (cardId) => {
    setActioningCards(prev => new Set([...prev, cardId]));
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game || !game.dramaCards?.hands?.[playerName]) return game;

        const currentHand = game.dramaCards.hands[playerName];
        const playedCard = currentHand.find(c => c.id === cardId);
        
        if (!playedCard) return game;

        // Create a deep copy of the game state to modify
        const updatedGame = JSON.parse(JSON.stringify(game));

        // Remove card from hand
        updatedGame.dramaCards.hands[playerName] = currentHand.filter(c => c.id !== cardId);

        // Initialize played as an array if it doesn't exist or is an object
        if (!updatedGame.dramaCards.played || !Array.isArray(updatedGame.dramaCards.played)) {
          // If it's an object, convert it to an array
          if (updatedGame.dramaCards.played && typeof updatedGame.dramaCards.played === 'object') {
            updatedGame.dramaCards.played = Object.values(updatedGame.dramaCards.played);
          } else {
            updatedGame.dramaCards.played = [];
          }
        }

        // Add to played history
        const timestamp = Date.now();
        updatedGame.dramaCards.played.push({
          playerId: playerName,
          card: playedCard,
          timestamp
        });

        // Update current turn's drama cards history
        if (updatedGame.turnHistory && updatedGame.turnHistory.length > 0) {
          const currentTurn = updatedGame.turnHistory[updatedGame.turnHistory.length - 1];
          console.log('📝 Adding played drama card to turn:', currentTurn.turn);
          
          // Initialize arrays if they don't exist
          if (!currentTurn.dramaCards) {
            currentTurn.dramaCards = { played: [], discarded: [] };
          }
          if (!Array.isArray(currentTurn.dramaCards.played)) {
            currentTurn.dramaCards.played = [];
          }
          
          // Ensure all required properties exist before adding to turn history
          const turnHistoryCard = {
            id: playedCard.id || '',
            title: playedCard.title || '',
            type: playedCard.type || 'drama', // Default to 'drama' if type is missing
            playedBy: playerName,
            timestamp
          };
          
          currentTurn.dramaCards.played.push(turnHistoryCard);
          
          console.log('✅ Updated turn history:', {
            turn: currentTurn.turn,
            dramaCardsPlayed: currentTurn.dramaCards.played.length,
            lastCard: turnHistoryCard // Log the card being added for verification
          });
        }

        return updatedGame;
      });

      // Draw a new card
      await fillHand();
    } catch (err) {
      console.error('Failed to play card:', err);
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
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game || !game.dramaCards?.hands?.[playerName]) return game;

        const currentHand = game.dramaCards.hands[playerName];
        const discardedCard = currentHand.find(c => c.id === cardId);
        
        if (!discardedCard) return game;

        // Remove card from hand
        game.dramaCards.hands[playerName] = currentHand.filter(c => c.id !== cardId);

        // Add to discard history
        game.dramaCards.discarded = game.dramaCards.discarded || [];
        game.dramaCards.discarded.push({
          playerId: playerName,
          card: discardedCard,
          timestamp: Date.now()
        });

        return game;
      });

      // Draw a new card
      await fillHand();
    } catch (err) {
      console.error('Failed to discard card:', err);
      setError('Kunne ikke forkaste kortet. Prøv igjen.');
    } finally {
      setActioningCards(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  const loadHand = async () => {
    try {
      const snap = await get(ref(db, `games/${gameId}/dramaCards/hands/${playerName}`));
      const val = snap.val();
      const handArray = Array.isArray(val) ? val : [];
      console.log('✍️ Henter starthånd:', handArray);
      
      // If hand is empty or incomplete, try to fill it
      if (handArray.length < HAND_SIZE) {
        console.log('🎲 Hand is incomplete after loading, filling...');
        await fillHand();
      } else {
        setHand(handArray);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load hand:', err);
      setError('Kunne ikke laste inn hånden din. Prøv å laste siden på nytt.');
    }
  };

  const resetGame = async () => {
    setIsLoading(true);
    try {
      // Fetch fresh cards from Google Sheets
      const sheetCards = await fetchDramaCards();
      if (sheetCards.length === 0) {
        throw new Error('No cards found in the sheet');
      }

      await set(ref(db, `games/${gameId}`), {
        cards: sheetCards,
        discard: [],
        hands: {},
        played: {} // Reset played cards history
      });
      console.log('🔄 Reset game with fresh cards from sheet');
      await loadHand();
      // Fill hand with new cards after reset
      await fillHand();
      setShowResetConfirm(false);
    } catch (err) {
      console.error('Failed to reset game:', err);
      setError('Kunne ikke tilbakestille spillet. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDeckStatus = (game) => {
    const allCards = game.cards || [];
    const discard = game.discard || [];
    const allHands = game.hands || {};
    
    const playedOrHeldIds = new Set([
      ...Object.values(allHands).flat().map(card => card.id),
      ...discard.map(card => card.id)
    ]);
    
    const availableCards = allCards.filter(card => !playedOrHeldIds.has(card.id));
    
    setDeckStatus({
      total: allCards.length,
      available: availableCards.length,
      discarded: discard.length
    });
  };

  // Add this useEffect to update deck status
  useEffect(() => {
    const gameRef = ref(db, `games/${gameId}`);
    onValue(gameRef, (snapshot) => {
      const game = snapshot.val();
      if (game) {
        updateDeckStatus(game);
      }
    });
  }, [gameId]);

  // Modify setup effect to ensure proper initialization order
  useEffect(() => {
    const setup = async () => {
      try {
        if (!isRegistered) {
          console.log('⏳ Waiting for player registration...');
          return;
        }

        setIsLoading(true);
        console.log('🎲 Starting drama cards setup...');
        
        // First ensure game and cards are initialized
        await initializeGameIfNeeded();
        
        // Then load the player's hand
        await loadHand();
        
        // Check if hand needs filling
        const handRef = ref(db, `games/${gameId}/dramaCards/hands/${playerName}`);
        const handSnap = await get(handRef);
        const currentHand = handSnap.val() || [];
        
        if (!Array.isArray(currentHand) || currentHand.length < HAND_SIZE) {
          console.log('🎴 Filling hand at startup');
          await fillHand();
        }
        
        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('Setup failed:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    if (playerName && gameId) {
      setup();
    }
  }, [playerName, gameId, isRegistered]);

  // Add cleanup function for orphaned hands
  const cleanupOrphanedHands = async () => {
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game) return game;

        const hands = game.hands || {};
        const players = game.players || {};

        // Find hands that don't have corresponding players
        Object.keys(hands).forEach(handPlayer => {
          if (!players[handPlayer]) {
            console.log('🧹 Removing orphaned hand for:', handPlayer);
            delete hands[handPlayer];
          }
        });

        game.hands = hands;
        return game;
      });
    } catch (err) {
      console.error('Failed to cleanup orphaned hands:', err);
    }
  };

  // Add cleanup effect
  useEffect(() => {
    if (isRegistered) {
      cleanupOrphanedHands();
    }
  }, [isRegistered]);

  if (!isRegistered) {
    return (
      <div className="p-4">
        <p className="text-gray-600">Validerer spiller...</p>
      </div>
    );
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
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Dramakort ({hand.length}/{HAND_SIZE})</h2>
      </div>

      <ul className="space-y-4">
        {hand.map((card) => (
          <li 
            key={card.id} 
            className="bg-white rounded-lg shadow p-4"
          >
            <h3 className="text-lg font-bold mb-2">{card.title}</h3>
            {card.text && (
              <p className="text-sm text-gray-600 mb-3">
                {card.text}
              </p>
            )}
            {card.type && (
              <p className="text-sm text-gray-500 mb-3">
                Type: {card.type}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => playCard(card.id)}
                disabled={actioningCards.has(card.id)}
                className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {actioningCards.has(card.id) ? 'Spiller...' : 'Spill'}
              </button>
              <button
                onClick={() => discardCard(card.id)}
                disabled={actioningCards.has(card.id)}
                className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {actioningCards.has(card.id) ? 'Forkaster...' : 'Forkast'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
