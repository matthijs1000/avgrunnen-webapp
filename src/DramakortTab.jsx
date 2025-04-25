import { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { ref, runTransaction, get, set, onValue } from 'firebase/database';
import { fetchDramaCards } from './utils/sheetsConfig';
import { Notification } from './components/ui/notification';

const HAND_SIZE = 5;

export default function DramakortTab({ gameState }) {
  const [hand, setHand] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actioningCards, setActioningCards] = useState(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [notification, setNotification] = useState(null);

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
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game?.dramaCards?.hands?.[playerName]) return game;

        const currentHand = game.dramaCards.hands[playerName];
        const playedCard = currentHand.find(c => c.id === cardId);
        
        if (!playedCard) return game;

        // Remove card from hand
        game.dramaCards.hands[playerName] = currentHand.filter(c => c.id !== cardId);

        // Initialize played object if it doesn't exist
        if (!game.dramaCards.played) {
          game.dramaCards.played = {};
        }

        // Add to played cards history
        const timestamp = Date.now();
        game.dramaCards.played[timestamp] = {
          playerId: playerName,
          card: playedCard,
          timestamp
        };

        // Add notification about played card
        const characterName = character || playerName;
        game.notifications = game.notifications || {};
        game.notifications[timestamp] = {
          type: 'drama_card_played',
          timestamp,
          text: `${characterName} spilte dramakortet "${playedCard.title}"`,
          cardType: playedCard.type
        };

        return game;
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

  // Add effect to monitor notifications
  useEffect(() => {
    if (!gameId) return;
    
    const notificationsRef = ref(db, `games/${gameId}/notifications`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const notifications = snapshot.val();
      if (notifications) {
        // Find the most recent card play notifications
        const cardNotifications = Object.values(notifications)
          .filter(n => n.type === 'drama_card_played' || n.type === 'scene_card_played')
          .sort((a, b) => b.timestamp - a.timestamp);
        
        if (cardNotifications.length > 0) {
          const latestNotification = cardNotifications[0];
          setNotification(latestNotification.text);
        }
      }
    });
    
    return () => unsubscribe();
  }, [gameId]);

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
      {notification && (
        <Notification
          message={notification}
          onClose={() => setNotification(null)}
          duration={3000} // Shorter duration for card play notifications
        />
      )}
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
            <button
              onClick={() => playCard(card.id)}
              disabled={actioningCards.has(card.id)}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {actioningCards.has(card.id) ? 'Spiller...' : 'Spill'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 