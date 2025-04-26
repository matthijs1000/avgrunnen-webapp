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
const isCardAvailableToDraw = (card, playerName, playedCards, allHandCards, activeCardIds) => {
  // First check if the card is active in the current act
  if (activeCardIds && !activeCardIds.has(card.id)) {
    return false;
  }

  // Card is available if:
  // 1. It hasn't been played yet AND
  // 2. It's not in anyone's hand AND
  // 3. It's either unowned OR owned by the current player
  const cardPlayerId = getCardPlayerId(card)?.toLowerCase();
  const currentPlayerName = playerName.toLowerCase();
  const notInHand = !allHandCards.some(handCard => handCard.id === card.id);
  
  const isAvailable = !playedCards.has(card.id) && 
                     notInHand && 
                     (!cardPlayerId || cardPlayerId === currentPlayerName);
  return isAvailable;
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
  const [deckStatus, setDeckStatus] = useState({
    total: 0,
    available: 0,
    inDeck: 0,
    played: 0,
    inOtherHands: 0
  });
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
    const otherHandsCards = Object.entries(data.hands || {})
      .filter(([id]) => id.toLowerCase() !== playerName.toLowerCase())
      .flatMap(([, cards]) => cards);
    const activeCardIds = new Set(data.activeCards || []);
    
    // Count cards in deck (not in any hand AND not played AND active in current act)
    const cardsInDeck = allCards.filter(card => {
      const notInHand = !allHandCards.some(handCard => handCard.id === card.id);
      const notPlayed = !playedCards.some(p => p.card.id === card.id);
      const isActive = activeCardIds.has(card.id);
      return notInHand && notPlayed && isActive;
    });

    // Count available cards (not in any hand AND not played AND active AND either unowned or owned by current player)
    const availableCards = cardsInDeck.filter(card => {
      const cardPlayerId = getCardPlayerId(card)?.toLowerCase();
      const currentPlayerName = playerName.toLowerCase();
      return !cardPlayerId || cardPlayerId === currentPlayerName;
    });

    setDeckStatus({
      total: allCards.length,
      available: availableCards.length,
      inDeck: cardsInDeck.length,
      played: playedCards.length,
      inOtherHands: otherHandsCards.length
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
                const isAvailable = isCardAvailableToDraw(card, playerName, allPlayedCardIds, allHandCards);
                
                if (!notInHand) console.log(`❌ Card ${card.id} is in a hand`);
                if (!notPlayed) console.log(`❌ Card ${card.id} has been played`);
                if (!isAvailable) console.log(`❌ Card ${card.id} is not available to draw (${card.title}) - owned by ${card.playerId || 'none'}`);
                
                return notInHand && notPlayed && isAvailable;
              });

              

              if (availableCards.length === 0) {
                
                return data;
              }

              // Draw a random available card
              const newCard = availableCards[Math.floor(Math.random() * availableCards.length)];
              
              
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
    
    setHand(playerHand);

    // Auto-fill hand if needed
    if (playerHand.length < HAND_SIZE) {
    
      fillHand();
    }
  }, [gameState, playerName]);

  const fillHand = async () => {
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game || !game.sceneCards) return game;

        
        
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

        
        if (cardsNeeded <= 0) {
          
          return game;
        }

        // Get all cards that are currently in hands
        const allHandCards = Object.values(game.sceneCards.hands).flat();
        const handCardIds = new Set(allHandCards.map(card => card.id));
        
        // Get all played cards
        const playedCards = game.sceneCards.played || [];
        const playedCardIds = new Set(playedCards.map(p => p.card.id));

        // Get active cards for current act
        const activeCardIds = new Set(game.sceneCards.activeCards || []);

        
        // Find available cards (not in any hand AND not played)
        const availableCards = allCards.filter(card => {
          const notInHand = !handCardIds.has(card.id);
          const notPlayed = !playedCardIds.has(card.id);
          const isAvailable = isCardAvailableToDraw(card, playerName, playedCardIds, allHandCards, activeCardIds);
          
          
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
    if (!gameState?.gameStarted) {
      setError('Spillet har ikke startet ennå. Vent til admin starter spillet.');
      return;
    }

    if (gameState.currentDirector !== playerName) {
      setError('Bare regissøren kan spille scenekort. Vent til det er din tur.');
      return;
    }

    console.log('🎬 Playing scene card:', cardId);

    setActioningCards(prev => new Set([...prev, cardId]));
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game?.sceneCards?.hands?.[playerName]) return game;

        const currentHand = game.sceneCards.hands[playerName];
        const playedCard = currentHand.find(c => c.id === cardId);
        
        if (!playedCard) return game;

        // Remove card from hand
        game.sceneCards.hands[playerName] = currentHand.filter(c => c.id !== cardId);

        // Initialize played array if it doesn't exist
        if (!Array.isArray(game.sceneCards.played)) {
          game.sceneCards.played = [];
        }

        // Add to played cards history
        game.sceneCards.played.push({
          playerId: playerName,
          card: playedCard,
          timestamp: Date.now()
        });

        // Get next director from the ordered list
        const directorOrder = game.directorOrder || [];
        
        if (directorOrder.length > 0) {
          const currentIndex = directorOrder.findIndex(p => p === game.currentDirector);
          const nextIndex = (currentIndex + 1) % directorOrder.length;
          const nextDirector = directorOrder[nextIndex];
          
          console.log('🎭 Director rotation:', {
            currentDirector: game.currentDirector,
            nextDirector
          });
          
          game.currentDirector = nextDirector;
        }

        // Increment turn counter
        game.currentTurn = (game.currentTurn || 1) + 1;

        // Initialize turnHistory if it doesn't exist
        if (!Array.isArray(game.turnHistory)) {
          game.turnHistory = [];
        }

        // Create turn log
        const turnLog = {
          turn: game.currentTurn,
          timestamp: Date.now(),
          act: game.sceneCards.currentAct,
          sceneCard: {
            id: playedCard.id,
            title: playedCard.title,
            type: playedCard.type,
            playedBy: playerName
          },
          director: game.currentDirector,
          dramaCards: {
            played: [],
            discarded: []
          }
        };

        console.log('📝 Adding turn log:', turnLog);
        game.turnHistory.push(turnLog);

        return game;
      });

      // Verify the write by reading back
      const gameSnapshot = await get(ref(db, `games/${gameId}`));
      const updatedGame = gameSnapshot.val();
      console.log('✅ Turn log verification:', {
        turnHistoryExists: Boolean(updatedGame.turnHistory),
        lastTurn: updatedGame.turnHistory?.[updatedGame.turnHistory.length - 1]
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

  // Add automatic act progression when all cards are played
  useEffect(() => {
    if (!gameState?.sceneCards) return;
    
    const { cards, played, currentAct, activeCards } = gameState.sceneCards;
    
    if (!cards || !played || !activeCards) return;
    
    const playedActiveCardIds = played
      .map(p => p.card.id)
      .filter(id => activeCards.includes(id));
    
    if (playedActiveCardIds.length === activeCards.length && currentAct < 3) {
      console.log('🎬 All active cards for current act have been played, progressing to next act');
      
      runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game) return game;
        
        const nextAct = (game.sceneCards.currentAct || 1) + 1;
        console.log(`🎬 Progressing to Act ${nextAct}`);
        
        // Filter cards for the new act
        const nextActCards = game.sceneCards.cards.filter(card => {
          const actKey = `act${nextAct}`;
          return String(card[actKey] || '').toUpperCase() === "TRUE" || card[actKey] === true;
        });
        
        // Add act progression to turn history
        game.turnHistory = game.turnHistory || [];
        const actProgressionLog = {
          turn: game.currentTurn,
          timestamp: Date.now(),
          type: 'act_progression',
          previousAct: game.sceneCards.currentAct,
          newAct: nextAct,
          activeCards: nextActCards.length
        };
        
        console.log('📝 Writing act progression to turn history:', actProgressionLog);
        game.turnHistory.push(actProgressionLog);
        
        // Update scene cards state
        game.sceneCards = {
          ...game.sceneCards,
          currentAct: nextAct,
          activeCards: nextActCards.map(card => card.id),
          hands: {}, // Clear all hands for new act
          played: [] // Clear played cards for new act
        };
        
        // Reset turn counter and director for new act
        game.currentTurn = 1;
        game.currentDirector = null;

        console.log('🎮 Updated game state after act progression:', {
          currentAct: nextAct,
          activeCards: nextActCards.length,
          turnHistory: game.turnHistory.length,
          lastLog: actProgressionLog
        });
        
        return game;
      });
    }
  }, [gameState?.sceneCards?.played?.length, gameId]);

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
          <div>
            <h2 className="text-xl font-bold">Dine Scenekort ({hand.length}/{HAND_SIZE})</h2>
            {!gameState?.gameStarted && (
              <p className="text-sm text-gray-500 mt-1">Venter på at spillet skal starte...</p>
            )}
            {gameState?.gameStarted && gameState.currentDirector !== playerName && (
              <p className="text-sm text-gray-500 mt-1">Venter på din tur som regissør...</p>
            )}
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
                  disabled={actioningCards.has(card.id) || !gameState?.gameStarted || gameState.currentDirector !== playerName}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {actioningCards.has(card.id) ? 'Spiller...' : 'Spill'}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Deck Status Box */}
      <div className="fixed bottom-16 left-0 right-0 mx-4">
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-gray-300">
              <span className="font-semibold">Akt:</span> {gameState?.sceneCards?.currentAct || 1}
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
    </div>
  );
} 