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

export default function KortTabFirebase() {
  const [hand, setHand] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  console.log('🧠 Spiller:', playerName);
  console.log('🧠 Aktiv gameId:', gameId);

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
      const gameSnapshot = await get(ref(db, `games/${gameId}`));
      if (!gameSnapshot.exists()) {
        // Fetch cards from Google Sheets
        const sheetCards = await fetchDramaCards();
        if (sheetCards.length === 0) {
          throw new Error('No cards found in the sheet');
        }
        
        await set(ref(db, `games/${gameId}`), {
          cards: sheetCards,
          discard: [],
          hands: {}
        });
        console.log('🎲 Initialized new game with cards from sheet');
      }
    } catch (err) {
      console.error('Failed to initialize game:', err);
      setError('Kunne ikke koble til spillet. Sjekk internett-tilkoblingen.');
    }
  };

  const fillHand = async () => {
    setIsLoading(true);
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game) return null;

        const allCards = game.cards || [];
        const discard = game.discard || [];
        const allHands = game.hands || {};

        // Ensure all hands are arrays
        Object.keys(allHands).forEach(player => {
          allHands[player] = Array.isArray(allHands[player]) ? allHands[player] : [];
        });

        // Get current hand
        const currentHand = Array.isArray(game.hands?.[playerName]) ? game.hands[playerName] : [];
        const cardsNeeded = HAND_SIZE - currentHand.length;

        if (cardsNeeded <= 0) {
          console.log('✋ Hånden er allerede full');
          return game;
        }

        // Get all cards that are currently in play
        const playedOrHeldIds = new Set([
          ...Object.values(allHands).flat().map(card => card.id),
          ...(discard || []).map(card => card.id)
        ]);
        
        // Create a copy of all cards that we can modify
        let availableCards = allCards.filter(card => !playedOrHeldIds.has(card.id));

        console.log(`▶️ Forsøker å trekke ${cardsNeeded} kort. Tilgjengelige kort:`, availableCards.length);

        // If no cards available and we have discarded cards, shuffle them back in
        if (availableCards.length === 0 && discard.length > 0) {
          console.log('♻️ Stokker discard tilbake i bunken');
          availableCards = [...discard];
          game.discard = [];
        }

        // If still no cards available after trying discard pile
        if (availableCards.length === 0) {
          console.warn('🚫 Ingen kort tilgjengelig');
          return game;
        }

        // Shuffle the available cards
        for (let i = availableCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableCards[i], availableCards[j]] = [availableCards[j], availableCards[i]];
        }

        // Take cards up to cardsNeeded or available cards length
        const numCardsToDraw = Math.min(cardsNeeded, availableCards.length);
        const newCards = availableCards.slice(0, numCardsToDraw);

        // Update the player's hand
        game.hands = game.hands || {};
        game.hands[playerName] = [...currentHand, ...newCards];

        console.log(`🎴 Trakk ${newCards.length} kort`);
        return game;
      });
      
      // After filling hand, load it
      const snapshot = await get(ref(db, `games/${gameId}/hands/${playerName}`));
      const newHand = snapshot.val() || [];
      if (!Array.isArray(newHand) || newHand.length < HAND_SIZE) {
        console.warn('⚠️ Hand still not full after filling:', newHand.length);
        // You might want to retry or show an error here
      } else {
        setHand(newHand);
      }
    } catch (err) {
      console.error('Failed to fill hand:', err);
      setError('Kunne ikke fylle hånden. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const discardCard = async (cardId) => {
    setActioningCards(prev => new Set([...prev, cardId]));
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game || !game.hands?.[playerName]) return game;

        // Ensure we're working with arrays
        const playerHand = Array.isArray(game.hands[playerName]) ? game.hands[playerName] : [];
        const updatedHand = playerHand.filter((c) => c.id !== cardId);
        const discardedCard = playerHand.find((c) => c.id === cardId);

        if (!discardedCard) return game;

        // Move card to discard pile
        game.hands[playerName] = updatedHand;
        game.discard = [...(game.discard || []), discardedCard];

        // Draw a new card immediately
        const allCards = game.cards || [];
        const allHands = game.hands || {};

        // Ensure all hands are arrays
        Object.keys(allHands).forEach(player => {
          allHands[player] = Array.isArray(allHands[player]) ? allHands[player] : [];
        });

        const playedOrHeldIds = new Set([
          ...Object.values(allHands).flat().map(card => card.id),
          ...(game.discard || []).map(card => card.id),
        ]);
        
        const available = allCards.filter((card) => !playedOrHeldIds.has(card.id));

        if (available.length === 0 && game.discard.length > 0) {
          // If no cards available, shuffle discard back in (except for the card we just discarded)
          const oldDiscard = game.discard.slice(0, -1); // All but the last card (which we just discarded)
          available.push(...oldDiscard);
          game.discard = [discardedCard]; // Keep only the just-discarded card
        }

        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          const newCard = available[randomIndex];
          game.hands[playerName] = [...updatedHand, newCard];
        }

        console.log(`🗑️ Kaster kort: ${cardId}`);
        return game;
      });
      await loadHand();
    } catch (err) {
      console.error('Failed to discard card:', err);
      setError('Kunne ikke kaste kortet. Prøv igjen.');
    } finally {
      setActioningCards(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  const playCard = async (cardId) => {
    setActioningCards(prev => new Set([...prev, cardId]));
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game || !game.hands?.[playerName]) return game;

        const playerHand = Array.isArray(game.hands[playerName]) ? game.hands[playerName] : [];
        const playedCard = playerHand.find((c) => c.id === cardId);
        const updatedHand = playerHand.filter((c) => c.id !== cardId);

        if (!playedCard) return game;

        // Update the hand
        game.hands[playerName] = updatedHand;

        // Add to discard pile
        game.discard = [...(game.discard || []), playedCard];

        // Add to played cards with timestamp for history
        game.played = game.played || {};
        const newPlayedRef = push(ref(db, `games/${gameId}/played`));
        game.played[newPlayedRef.key] = {
          playerId: playerName,
          card: playedCard,
          timestamp: Date.now(),
        };

        // Draw a new card immediately
        const allCards = game.cards || [];
        const allHands = game.hands || {};

        // Ensure all hands are arrays
        Object.keys(allHands).forEach(player => {
          allHands[player] = Array.isArray(allHands[player]) ? allHands[player] : [];
        });

        const playedOrHeldIds = new Set([
          ...Object.values(allHands).flat().map(card => card.id),
          ...(game.discard || []).map(card => card.id),
        ]);
        
        const available = allCards.filter((card) => !playedOrHeldIds.has(card.id));

        if (available.length === 0 && game.discard.length > 0) {
          // If no cards available, shuffle discard back in (except for the card we just played)
          const oldDiscard = game.discard.slice(0, -1); // All but the last card (which we just played)
          available.push(...oldDiscard);
          game.discard = [playedCard]; // Keep only the just-played card
        }

        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          const newCard = available[randomIndex];
          game.hands[playerName] = [...updatedHand, newCard];
        }

        console.log(`🎭 Spiller kort: ${cardId}`);
        return game;
      });

      await loadHand();
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

  const loadHand = async () => {
    try {
      const snap = await get(ref(db, `games/${gameId}/hands/${playerName}`));
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

  // Modify setup effect to check registration
  useEffect(() => {
    const setup = async () => {
      try {
        if (!isRegistered) {
          console.log('⏳ Waiting for player registration...');
          return;
        }

        await initializeGameIfNeeded();
        await loadHand();
        
        // Check if hand needs filling
        const handRef = ref(db, `games/${gameId}/hands/${playerName}`);
        const handSnap = await get(handRef);
        const currentHand = handSnap.val() || [];
        
        if (!Array.isArray(currentHand) || currentHand.length < HAND_SIZE) {
          console.log('🎴 Fyller hånd automatisk ved oppstart');
          await fillHand();
        }
        
        setIsLoading(false);
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
        <h2 className="text-xl font-bold mb-2">Hånden din ({hand.length}/{HAND_SIZE})</h2>
        <div className="text-sm text-gray-600">
          <p>Kort i bunken: {deckStatus.available}</p>
          <p>Kastede kort: {deckStatus.discarded}</p>
          {deckStatus.available === 0 && deckStatus.discarded === 0 && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded">
              <p className="font-medium">Bunken er tom!</p>
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
              >
                Tilbakestill spillet
              </button>
            </div>
          )}
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {hand.map((card) => (
          <li 
            key={card.id} 
            className="card"
          >
            <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
            {card.text && (
              <p className="text-sm text-gray-300 leading-relaxed mb-3">
                {card.text}
              </p>
            )}
            {card.image && (
              <div className="mb-3 rounded-md overflow-hidden shadow-sm">
                <img 
                  src={card.image.startsWith('http') ? card.image : card.image}
                  alt={card.title}
                  className="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    console.log('Failed to load image:', card.image);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => playCard(card.id)}
                disabled={actioningCards.has(card.id)}
              >
                {actioningCards.has(card.id) ? 'Spiller...' : 'Spill'}
              </button>
              <button 
                onClick={() => discardCard(card.id)}
                disabled={actioningCards.has(card.id)}
                className="discard"
              >
                {actioningCards.has(card.id) ? 'Kaster...' : 'Kast'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Siste hendelser</h2>
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const timeAgo = new Date(notification.timestamp).toLocaleTimeString('no-NO', {
              hour: '2-digit',
              minute: '2-digit'
            });
            
            const isNew = newNotificationIds.has(notification.timestamp);
            
            return (
              <li 
                key={notification.timestamp} 
                className={`bg-white p-3 rounded-md shadow-sm border border-gray-100 transition-all duration-300 ${
                  isNew ? 'animate-slide-in border-green-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-gray-900">{notification.playerId}</span>
                    <span className="text-gray-600"> spilte </span>
                    <span className="font-medium text-gray-900">{notification.card.title}</span>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {timeAgo}
                  </span>
                </div>
                {notification.card.text && (
                  <p className="mt-1 text-sm text-gray-600 italic">
                    "{notification.card.text}"
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8">
        <button 
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tilbakestill spill
        </button>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Bekreft tilbakestilling</h3>
            <p className="mb-6 text-gray-600">
              Er du sikker på at du vil tilbakestille spillet? Dette vil fjerne alle kort fra alle spilleres hender og stokke kortstokken på nytt.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Avbryt
              </button>
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
