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
import { fetchCardsFromSheet } from './utils/sheetsConfig';

const HAND_SIZE = 5;
const NOTIFICATION_LIMIT = 5; // Number of notifications to show

export default function KortTabFirebase() {
  const [hand, setHand] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [deckStatus, setDeckStatus] = useState({ total: 0, available: 0, discarded: 0 });

  const playerName = localStorage.getItem('name');
  const gameId = localStorage.getItem('gameId');

  console.log('🧠 Spiller:', playerName);
  console.log('🧠 Aktiv gameId:', gameId);

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
        setNotifications(notificationsList);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // Initialize game if needed
  const initializeGameIfNeeded = async () => {
    try {
      const gameSnapshot = await get(ref(db, `games/${gameId}`));
      if (!gameSnapshot.exists()) {
        // Fetch cards from Google Sheets
        const sheetCards = await fetchCardsFromSheet();
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
      
      await loadHand();
    } catch (err) {
      console.error('Failed to fill hand:', err);
      setError('Kunne ikke fylle hånden. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const discardCard = async (cardId) => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const playCard = async (cardId) => {
    setIsLoading(true);
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

        console.log(`🎭 Spiller kort: ${cardId}`);
        return game;
      });

      // Draw a new card automatically after playing
      await fillHand();
    } catch (err) {
      console.error('Failed to play card:', err);
      setError('Kunne ikke spille kortet. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHand = async () => {
    try {
      const snap = await get(ref(db, `games/${gameId}/hands/${playerName}`));
      // Ensure we always have an array, even if Firebase returns an object or null
      const val = snap.val();
      const handArray = Array.isArray(val) ? val : (val ? Object.values(val) : []);
      console.log('✍️ Henter starthånd:', handArray);
      setHand(handArray);
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
      const sheetCards = await fetchCardsFromSheet();
      if (sheetCards.length === 0) {
        throw new Error('No cards found in the sheet');
      }

      await set(ref(db, `games/${gameId}`), {
        cards: sheetCards,
        discard: [],
        hands: {}
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

  useEffect(() => {
    const setup = async () => {
      setIsLoading(true);
      try {
        await initializeGameIfNeeded();
        await loadHand();
        // If hand is empty after loading, fill it
        const snapshot = await get(ref(db, `games/${gameId}/hands/${playerName}`));
        const currentHand = snapshot.val() || [];
        if (Array.isArray(currentHand) && currentHand.length === 0) {
          await fillHand();
        }
      } catch (err) {
        console.error('Setup failed:', err);
        setError('Noe gikk galt under oppstart. Prøv å laste siden på nytt.');
      } finally {
        setIsLoading(false);
      }
    };
    setup();
  }, []);

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
      <h2 className="text-xl font-bold mb-4">Hånden din ({hand.length}/{HAND_SIZE})</h2>
      {isLoading ? (
        <p>Laster...</p>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
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
          <ul className="space-y-2 mb-4">
            {hand.map((card) => (
              <li key={card.id} className="p-3 bg-white rounded shadow">
                <h3 className="font-medium">{card.title}</h3>
                {card.text && <p className="text-sm text-gray-600 mt-1">{card.text}</p>}
                {card.image && card.image.startsWith('http') && (
                  <div className="my-2">
                    <img 
                      src={card.image} 
                      alt={card.title}
                      className="w-full h-48 object-cover rounded"
                      onError={(e) => {
                        console.log('Failed to load image:', card.image);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={() => playCard(card.id)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Spill
                  </button>
                  <button 
                    onClick={() => discardCard(card.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    Kast
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 bg-black/5 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Siste hendelser</h3>
        {notifications.length === 0 ? (
          <p className="text-gray-500 italic">Ingen kort er spilt ennå</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <li 
                key={notification.timestamp} 
                className="text-sm bg-white p-2 rounded shadow-sm"
              >
                <span className="font-medium">{notification.playerId}</span> spilte kortet{' '}
                <span className="font-medium">{notification.card.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
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
