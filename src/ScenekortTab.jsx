import { useEffect, useState } from 'react';
import { db } from './firebaseConfig';
import {
  ref,
  get,
  set,
  runTransaction,
  onValue,
} from 'firebase/database';
import { fetchSceneCards } from './utils/sheetsConfig';

const HAND_SIZE = 3;

// Helper function to check if a card belongs to a player (case-insensitive)
const getCardPlayerId = (card) => {
  // Handle both playerId and playerid cases
  const id = card.playerId || '';
  return id.trim();
};

const isCardOwnedByPlayer = (card, playerName) => {
  const id = getCardPlayerId(card);
  return id && id.toLowerCase() === playerName.toLowerCase();
};

// Helper function to check if a card is available to draw
const isCardAvailableToDraw = (card, playerName, playedCards) => {
  // Card is available if:
  // 1. It hasn't been played yet AND
  // 2. It's either unowned OR owned by the current player
  const cardPlayerId = getCardPlayerId(card)?.toLowerCase();
  const currentPlayerName = playerName.toLowerCase();
  
  console.log(`🎴 Checking availability for card ${card.id} (${card.title}):`, {
    cardPlayerId,
    currentPlayerName,
    isPlayed: playedCards.has(card.id),
    isOwnedByPlayer: cardPlayerId === currentPlayerName,
    hasNoOwner: !cardPlayerId
  });
  
  return !playedCards.has(card.id) && (!cardPlayerId || cardPlayerId !== currentPlayerName);
};

// Helper function to normalize player ID case
const normalizePlayerId = (playerId) => {
  return playerId.toLowerCase();
};

// Scene card type icons component
const TypeIcon = ({ type }) => {
  switch (type?.toLowerCase()) {
    case 'relationship':
      return (
        <div className="flex items-center text-pink-400" title="Relasjonsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'goal':
      return (
        <div className="flex items-center text-yellow-400" title="Målscene">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
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
      return (
        <div className="flex items-center text-green-400" title="Utviklingsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'exploration':
      return (
        <div className="flex items-center text-purple-400" title="Utforskningsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'plan':
      return (
        <div className="flex items-center text-orange-400" title="Planleggingsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'change':
      return (
        <div className="flex items-center text-indigo-400" title="Endringsscene">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex items-center text-gray-400" title="Annen type scene">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
      );
  }
};

// Helper function to check if a card is playable by a player
const isCardPlayable = (card, playerName, playedCards, playerHand) => {
  // Card is playable if:
  // 1. It's in the player's hand AND
  // 2. It hasn't been played yet
  return playerHand.includes(card.id) && !playedCards.has(card.id);
};

export default function ScenekortTab({ gameState }) {
  const [sceneCards, setSceneCards] = useState([]);
  const [hand, setHand] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deckStatus, setDeckStatus] = useState({ total: 0, available: 0 });
  const [playerCount, setPlayerCount] = useState(0);
  const [playerCharacters, setPlayerCharacters] = useState({});
  const [actioningCards, setActioningCards] = useState(new Set());

  const playerName = localStorage.getItem('name');
  const gameId = localStorage.getItem('gameId');

  // Update deck status whenever cards or hands change
  const updateDeckStatus = (data) => {
    if (!data) return;

    const allCards = data.cards || [];
    const allHandCards = Object.values(data.hands || {}).flat();
    const playedCards = data.played || [];
    
    console.log('🎭 Deck Status Update:');
    console.log('📊 Total cards:', allCards.length);
    console.log('✋ Cards in hands:', allHandCards.map(c => c.id));
    console.log('🎭 Played cards:', playedCards.map(p => p.card.id));
    
    // Count available cards (not in any hand AND not played)
    const availableCards = allCards.filter(card => {
      const notInHand = !allHandCards.some(handCard => handCard.id === card.id);
      const notPlayed = !playedCards.some(p => p.card.id === card.id);
      const isAvailable = isCardAvailableToDraw(card, playerName, new Set(playedCards.map(p => p.card.id)));
      return notInHand && notPlayed && isAvailable;
    });

    console.log('✨ Available cards:', availableCards.map(c => c.id));

    setDeckStatus({
      total: allCards.length,
      available: availableCards.length
    });
  };

  // Add effect to monitor deck status and player count
  useEffect(() => {
    // Monitor scene cards
    const sceneCardsRef = ref(db, `games/${gameId}/sceneCards`);
    const unsubscribeSceneCards = onValue(sceneCardsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        updateDeckStatus(data);
      }
    });

    // Monitor players
    const playersRef = ref(db, `games/${gameId}/players`);
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      const players = snapshot.val();
      if (players) {
        setPlayerCount(Object.keys(players).length);
      }
    });

    return () => {
      unsubscribeSceneCards();
      unsubscribePlayers();
    };
  }, [gameId, playerName]);

  // Add effect to monitor players and their characters
  useEffect(() => {
    if (!gameId) return;

    const playersRef = ref(db, `games/${gameId}/players`);
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const players = snapshot.val() || {};
      const characters = {};
      console.log('👥 Processing players:', players);
      Object.entries(players).forEach(([playerId, data]) => {
        console.log(`👤 Processing player ${playerId}:`, data);
        if (data.character) {
          characters[playerId.toLowerCase()] = data.character;
          console.log(`✅ Added character for ${playerId}:`, data.character);
        }
      });
      console.log('🎭 Final characters mapping:', characters);
      setPlayerCharacters(characters);
      setPlayerCount(Object.keys(players).length);
    });

    return () => unsubscribe();
  }, [gameId]);

  // Clean up mismatched player IDs
  const cleanupPlayerIds = async () => {
    try {
      await runTransaction(ref(db, `games/${gameId}/sceneCards`), (data) => {
        if (!data) return data;

        // Fix case mismatches in cards
        data.cards = (data.cards || []).map(card => {
          if (card.playerId && card.playerId.toLowerCase() === playerName.toLowerCase()) {
            return { ...card, playerId: playerName }; // Update to correct case
          }
          return card;
        });

        // Fix case mismatches in hands
        const playerHandKey = Object.keys(data.hands || {})
          .find(key => key.toLowerCase() === playerName.toLowerCase());
        
        if (playerHandKey && playerHandKey !== playerName) {
          data.hands[playerName] = data.hands[playerHandKey];
          delete data.hands[playerHandKey];
        }

        return data;
      });
    } catch (err) {
      console.error('Failed to cleanup player IDs:', err);
    }
  };

  // Initialize scene cards if needed
  const initializeSceneCardsIfNeeded = async () => {
    try {
      const gameSnapshot = await get(ref(db, `games/${gameId}/sceneCards`));
      if (!gameSnapshot.exists()) {
        // Fetch scene cards from Google Sheets
        const sheetCards = await fetchSceneCards();
        if (sheetCards.length === 0) {
          throw new Error('No scene cards found in the sheet');
        }
        
        // Map the cards to set playerId properly
        const initializedCards = sheetCards.map(card => {
          // Only set playerId if it exists and is not empty, otherwise use empty string
          return {
            ...card,
            playerId: card.playerId?.trim() || ''
          };
        });
        
        await set(ref(db, `games/${gameId}/sceneCards`), {
          cards: initializedCards,
          hands: {},
          played: [] // Initialize as empty array
        });
        console.log('🎬 Initialized scene cards from sheet');
      }
    } catch (err) {
      console.error('Failed to initialize scene cards:', err);
      setError('Kunne ikke laste inn scenekortene. Sjekk internett-tilkoblingen.');
    }
  };

  // Load scene cards and hand
  const loadSceneCards = async () => {
    try {
      console.log('🎲 Loading scene cards...');
      const [cardsSnap, handSnap, playedSnap] = await Promise.all([
        get(ref(db, `games/${gameId}/sceneCards/cards`)),
        get(ref(db, `games/${gameId}/sceneCards/hands/${playerName}`)),
        get(ref(db, `games/${gameId}/sceneCards/played`))
      ]);
      
      const cards = cardsSnap.val() || [];
      const playerHand = handSnap.val() || [];
      const playedCards = playedSnap.val() || [];
      
      console.log('📥 Current cards:', cards.length);
      console.log('✋ Current hand:', playerHand.map(c => c.id));
      console.log('🎭 Played cards:', playedCards.map(p => p.card.id));
      
      setSceneCards(cards);
      setHand(playerHand);

      // Only draw cards if we don't have enough and we're not already loading
      if (playerHand.length < HAND_SIZE && !isLoading) {
        console.log(`🎴 Need to draw ${HAND_SIZE - playerHand.length} cards`);
        setIsLoading(true);
        try {
          // Draw cards one at a time to prevent race conditions
          for (let i = playerHand.length; i < HAND_SIZE; i++) {
            console.log(`🎲 Drawing card ${i + 1} of ${HAND_SIZE}...`);
            let drawn = false;
            
            await runTransaction(ref(db, `games/${gameId}/sceneCards`), (data) => {
              if (!data) return data;

              // Get all cards that are currently in hands
              const allHandCards = Object.values(data.hands || {}).flat();
              const allHandCardIds = new Set(allHandCards.map(card => card.id));
              
              // Get all played cards
              const allPlayedCards = data.played || [];
              const allPlayedCardIds = new Set(allPlayedCards.map(p => p.card.id));
              
              console.log('🔍 Current state:');
              console.log('✋ Cards in hands:', [...allHandCardIds]);
              console.log('🎭 Played cards:', [...allPlayedCardIds]);
              
              // Find available cards (not in any hand AND not played)
              const availableCards = (data.cards || []).filter(card => {
                const notInHand = !allHandCardIds.has(card.id);
                const notPlayed = !allPlayedCardIds.has(card.id);
                const isAvailable = isCardAvailableToDraw(card, playerName, allPlayedCardIds);
                
                if (!notInHand) console.log(`❌ Card ${card.id} is in a hand`);
                if (!notPlayed) console.log(`❌ Card ${card.id} has been played`);
                if (!isAvailable) console.log(`❌ Card ${card.id} is not available to draw (${card.title}) - owned by ${card.playerId || 'none'}`);
                
                return notInHand && notPlayed && isAvailable;
              });

              console.log(`📊 Available cards (${availableCards.length}):`, availableCards.map(c => c.id));

              if (availableCards.length === 0) {
                console.log('❌ No more cards available to draw');
                return data;
              }

              // Draw a random available card
              const newCard = availableCards[Math.floor(Math.random() * availableCards.length)];
              console.log('🎴 Drew card:', newCard.id, newCard.title);
              
              // Update the player's hand
              data.hands = data.hands || {};
              data.hands[playerName] = [...(data.hands[playerName] || []), newCard];

              drawn = true;
              return data;
            });

            if (!drawn) {
              console.log('⚠️ Failed to draw card, breaking loop');
              break;
            }

            // Refresh hand after each draw
            const newHandSnap = await get(ref(db, `games/${gameId}/sceneCards/hands/${playerName}`));
            const newHand = newHandSnap.val() || [];
            console.log('✨ Updated hand:', newHand.map(c => c.id));
            setHand(newHand);
          }
        } finally {
          setIsLoading(false);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to load scene cards:', err);
      setError('Kunne ikke laste inn scenekortene. Prøv å laste siden på nytt.');
      setIsLoading(false);
    }
  };

  // Update hand when gameState changes
  useEffect(() => {
    if (!gameState || !playerName) return;

    const playerHand = gameState.sceneCards?.hands?.[playerName] || [];
    console.log('📥 Current scene cards hand:', playerHand.length);
    setHand(playerHand);

    // Auto-fill hand if needed
    if (playerHand.length < HAND_SIZE) {
      console.log('🎴 Hand needs', HAND_SIZE - playerHand.length, 'more cards, filling...');
      fillHand();
    }
  }, [gameState, playerName]);

  const fillHand = async () => {
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game || !game.sceneCards) return game;

        console.log('🎴 Starting fillHand transaction');
        
        // Initialize hands if it doesn't exist
        if (!game.sceneCards.hands) {
          game.sceneCards.hands = {};
        }

        // Initialize player's hand if it doesn't exist
        if (!game.sceneCards.hands[playerName]) {
          game.sceneCards.hands[playerName] = [];
        }

        const allCards = game.sceneCards.cards || [];
        const currentHand = game.sceneCards.hands[playerName];
        const cardsNeeded = HAND_SIZE - currentHand.length;

        console.log('📊 Current state:');
        console.log('✋ Current hand:', currentHand.map(c => c.id));
        console.log('🎴 Cards needed:', cardsNeeded);

        if (cardsNeeded <= 0) {
          console.log('✋ Hand is already full');
          return game;
        }

        // Get all cards that are currently in hands
        const allHandCards = Object.values(game.sceneCards.hands).flat();
        const handCardIds = new Set(allHandCards.map(card => card.id));
        
        // Get all played cards
        const playedCards = game.sceneCards.played || [];
        const playedCardIds = new Set(playedCards.map(p => p.card.id));

        console.log('🔍 Card tracking:');
        console.log('✋ Cards in hands:', [...handCardIds]);
        console.log('🎭 Played cards:', [...playedCardIds]);

        // Find available cards (not in any hand AND not played)
        const availableCards = allCards.filter(card => {
          const notInHand = !handCardIds.has(card.id);
          const notPlayed = !playedCardIds.has(card.id);
          const isAvailable = isCardAvailableToDraw(card, playerName, playedCardIds);
          
          if (!notInHand) console.log(`❌ Card ${card.id} is in a hand`);
          if (!notPlayed) console.log(`❌ Card ${card.id} has been played`);
          if (!isAvailable) console.log(`❌ Card ${card.id} is not available to draw (${card.title}) - owned by ${card.playerId || 'none'}`);
          
          return notInHand && notPlayed && isAvailable;
        });

        console.log(`📊 Available cards (${availableCards.length}):`, availableCards.map(c => c.id));

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
        console.log('🎴 Drew cards:', newCards.map(c => `${c.id} (${c.title})`));

        // Update hand
        game.sceneCards.hands[playerName] = [...currentHand, ...newCards];
        
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
      await runTransaction(ref(db, `games/${gameId}/sceneCards`), (data) => {
        if (!data || !data.hands?.[playerName]) return data;

        const currentHand = data.hands[playerName];
        const playedCard = currentHand.find(c => c.id === cardId);
        
        if (!playedCard) return data;

        // Remove card from hand
        data.hands[playerName] = currentHand.filter(c => c.id !== cardId);

        // Initialize played array if it doesn't exist
        if (!Array.isArray(data.played)) {
          data.played = [];
        }

        // Find the original card to preserve ownership
        const originalCard = data.cards.find(c => c.id === cardId);
        
        // Add to played cards history, preserving the original playerId
        data.played.push({
          playerId: playerName,
          card: {
            id: playedCard.id,
            title: playedCard.title,
            text: playedCard.text,
            type: playedCard.type,
            image: playedCard.image,
            playerId: originalCard?.playerId || playedCard.playerId // Preserve original ownership
          },
          timestamp: Date.now()
        });

        return data;
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

  // Reset scene cards
  const resetSceneCards = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting scene cards reset...');
      const sheetCards = await fetchSceneCards();
      console.log('📥 Fetched cards from sheet:', sheetCards);
      
      if (sheetCards.length === 0) {
        throw new Error('No scene cards found in the sheet');
      }

      // Reset everything to initial state
      const resetData = {
        cards: sheetCards.map(card => {
          const existingId = getCardPlayerId(card);
          return {
            ...card,
            playerId: existingId?.trim() || '' // Use the normalized playerId property
          };
        }),
        hands: {}, // Clear all hands
        played: [] // Initialize as empty array
      };
      
      console.log('💾 Saving reset data:', resetData);
      await set(ref(db, `games/${gameId}/sceneCards`), resetData);
      console.log('✅ Reset complete');
      
      await loadSceneCards();
      setShowResetConfirm(false);
    } catch (err) {
      console.error('Failed to reset scene cards:', err);
      setError('Kunne ikke tilbakestille scenekortene. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial setup
  useEffect(() => {
    let isMounted = true;
    
    const setup = async () => {
      if (!gameId || !playerName) return;
      
      try {
        setIsLoading(true);
        console.log('🎬 Starting scene cards setup...');
        
        // First, check if scene cards exist
        const sceneCardsRef = ref(db, `games/${gameId}/sceneCards`);
        const sceneCardsSnap = await get(sceneCardsRef);
        
        if (!sceneCardsSnap.exists()) {
          console.log('🎲 No scene cards found, initializing...');
          // Fetch and initialize scene cards
          const sheetCards = await fetchSceneCards();
          if (sheetCards.length === 0) {
            throw new Error('No scene cards found in the sheet');
          }
          
          // Map the cards to set playerId properly
          const initializedCards = sheetCards.map(card => {
            // Only set playerId if it exists and is not empty, otherwise use empty string
            return {
              ...card,
              playerId: card.playerId?.trim() || ''
            };
          });
          
          await set(sceneCardsRef, {
            cards: initializedCards,
            hands: {},
            played: [] // Initialize as empty array
          });
          console.log('✅ Scene cards initialized');
        }
        
        // Clean up any case mismatches
        await cleanupPlayerIds();
        console.log('✅ Player ID cleanup complete');
        
        // Load current state
        const [cardsSnap, handSnap] = await Promise.all([
          get(ref(db, `games/${gameId}/sceneCards/cards`)),
          get(ref(db, `games/${gameId}/sceneCards/hands/${playerName}`))
        ]);
        
        if (!isMounted) return;
        
        const cards = cardsSnap.val() || [];
        const playerHand = handSnap.val() || [];
        
        setSceneCards(cards);
        setHand(playerHand);
        
        // If hand is not full, fill it
        if (playerHand.length < HAND_SIZE) {
          console.log(`🎴 Hand needs ${HAND_SIZE - playerHand.length} more cards, filling...`);
          await loadSceneCards();
        }
        
        setError(null);
      } catch (err) {
        console.error('Setup failed:', err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setup();
    
    return () => {
      isMounted = false;
    };
  }, [gameId, playerName]);

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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Dine Scenekort ({hand.length}/{HAND_SIZE})</h2>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Logg ut
          </button>
        </div>
        
        {/* Deck Status */}
        <div className="mb-4">
          <div className={`text-sm ${deckStatus.available <= playerCount ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
            {deckStatus.available === 0 ? (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Ingen flere kort tilgjengelig. Trykk på "Tilbakestill scenekort" for å starte på nytt.
              </div>
            ) : deckStatus.available <= playerCount ? (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Kun {deckStatus.available} kort igjen!
              </div>
            ) : (
              `Tilgjengelige kort: ${deckStatus.available}`
            )}
          </div>
          <div className="text-sm text-gray-600">
            Antall spillere: {playerCount}
          </div>
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {hand.map((card) => (
          <li 
            key={card.id} 
            className="card"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">{card.title}</h3>
              <TypeIcon type={card.type} />
            </div>
            {card.text && (
              <p className="text-sm text-gray-300 leading-relaxed mb-3">
                {card.text}
              </p>
            )}
            {card.image && (
              <div className="mb-3 rounded-md overflow-hidden shadow-sm">
                <img 
                  src={card.image}
                  alt={card.title}
                  className="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    console.log('Failed to load image:', card.image);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex flex-col space-y-2">
              {card.playerId && (() => {
                const ownershipDetails = {
                  cardId: card.id,
                  cardTitle: card.title,
                 
                  cardPlayerIdLower: card.playerId.toLowerCase(),
                  playerCharacters,
                  lookupKey: card.playerId.toLowerCase(),
                  characterFound: playerCharacters[card.playerId.toLowerCase()],
                  allKeys: Object.keys(playerCharacters),
                  allKeysLower: Object.keys(playerCharacters).map(k => k.toLowerCase()),
                  exactMatch: playerCharacters[card.playerId],
                  keyExists: card.playerId.toLowerCase() in playerCharacters,
                };
                console.log('🎴 Card ownership check:', ownershipDetails);
                const characterName = playerCharacters[card.playerId.toLowerCase()];
                return characterName && (
                  <div className="text-sm text-gray-400 text-right italic">
                    Eies av: {characterName}
                  </div>
                );
              })()}
              <div className="flex justify-end">
                <button 
                  onClick={() => playCard(card.id)}
                  disabled={actioningCards.has(card.id)}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {actioningCards.has(card.id) ? 'Spiller...' : 'Spill'}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <button 
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tilbakestill scenekort
        </button>
      </div>

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
              >
                Avbryt
              </button>
              <button
                onClick={resetSceneCards}
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