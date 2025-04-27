import React, { useEffect, useState } from 'react';
import { db } from './firebaseConfig';
import { useTheme } from './ThemeContext';
import {
  ref,
  get,
  set,
  runTransaction,
  onValue,
} from 'firebase/database';
import { fetchSceneCards } from './utils/sheetsConfig';
import { getCardPlayerId, isCardOwnedByPlayer, isCardAvailableToDraw, normalizePlayerId, isCardPlayable } from './components/scenekort-tab/helpers';
import { SceneCardItem } from './components/scenekort-tab/scene-card-item';
import { DeckStatusBox } from './components/scenekort-tab/deck-status-box';
import Director from './components/Director';
import { getForingerByTypeAndAct } from './utils/foringer';
import { Button } from './components/ui/button';
import { ClipboardList, Users } from 'lucide-react';

const HAND_SIZE = 3;

export default function ScenekortTab({ gameState }) {
  const [sceneCards, setSceneCards] = useState([]);
  const [hand, setHand] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
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
  const [showDirector, setShowDirector] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [showForinger, setShowForinger] = useState(false);
  const [foringerList, setForingerList] = useState({ acts: { 1: [], 2: [], 3: [] }, veien: [] });

  const playerName = localStorage.getItem('name');
  const gameId = localStorage.getItem('gameId');

  const currentAct = gameState?.sceneCards?.currentAct || 1;

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
    const currentPlayers = new Set(Object.keys(gameState?.players || {}).map(p => p.toLowerCase()));
    
    // Count cards in deck (not in any hand AND not played AND active in current act)
    const cardsInDeck = allCards.filter(card => {
      const notInHand = !allHandCards.some(handCard => handCard.id === card.id);
      const notPlayed = !playedCards.some(p => p.card.id === card.id);
      const isActive = activeCardIds.has(card.id);
      // Only available if unassigned or assigned to a current player
      const assignedToCurrent = !card.playerId || currentPlayers.has(card.playerId.toLowerCase());
      return notInHand && notPlayed && isActive && assignedToCurrent;
    });

    // Count available cards (not in any hand AND not played AND active AND either unowned or owned by ANYONE EXCEPT current player)
    const availableCards = cardsInDeck.filter(card => {
      const cardPlayerId = getCardPlayerId(card)?.toLowerCase();
      const currentPlayerName = playerName.toLowerCase();
      return (!cardPlayerId || cardPlayerId !== currentPlayerName);
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
              const currentPlayers = new Set(Object.keys(gameState?.players || {}).map(p => p.toLowerCase()));
              const availableCards = (data.cards || []).filter(card => {
                const notInHand = !allHandCardIds.has(card.id);
                const notPlayed = !allPlayedCardIds.has(card.id);
                const isAvailable = isCardAvailableToDraw(card, playerName, allPlayedCardIds, allHandCards);
                const assignedToCurrent = !card.playerId || currentPlayers.has(card.playerId.toLowerCase());
                if (!notInHand) console.log(`❌ Card ${card.id} is in a hand`);
                if (!notPlayed) console.log(`❌ Card ${card.id} has been played`);
                if (!isAvailable) console.log(`❌ Card ${card.id} is not available to draw (${card.title}) - owned by ${card.playerId || 'none'}`);
                if (!assignedToCurrent) console.log(`❌ Card ${card.id} is assigned to a player not in the game (${card.playerId})`);
                return notInHand && notPlayed && isAvailable && assignedToCurrent;
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

        // LOG: Hand before drawing
        console.log('[fillHand] Current hand before draw:', currentHand.map(c => `${c.id} (${c.title})`));

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
        const currentPlayers = new Set(Object.keys(gameState?.players || {}).map(p => p.toLowerCase()));
        const availableCards = allCards.filter(card => {
          const notInHand = !handCardIds.has(card.id);
          const notPlayed = !playedCardIds.has(card.id);
          const isAvailable = isCardAvailableToDraw(card, playerName, playedCardIds, allHandCards);
          const assignedToCurrent = !card.playerId || currentPlayers.has(card.playerId.toLowerCase());
          if (!notInHand) console.log(`[fillHand] ❌ Card ${card.id} is in a hand`);
          if (!notPlayed) console.log(`[fillHand] ❌ Card ${card.id} has been played`);
          if (!isAvailable) console.log(`[fillHand] ❌ Card ${card.id} is not available to draw (${card.title}) - owned by ${card.playerId || 'none'}`);
          if (!assignedToCurrent) console.log(`[fillHand] ❌ Card ${card.id} is assigned to a player not in the game (${card.playerId})`);
          return notInHand && notPlayed && isAvailable && assignedToCurrent;
        });
        // LOG: Available cards before drawing
        console.log('[fillHand] Available cards before draw:', availableCards.map(c => `${c.id} (${c.title})`));

        if (availableCards.length === 0) {
          console.warn('[fillHand] 🚫 No cards available');
          return game;
        }

        // Shuffle available cards
        for (let i = availableCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableCards[i], availableCards[j]] = [availableCards[j], availableCards[i]];
        }

        // Draw cards
        const newCards = availableCards.slice(0, cardsNeeded);
        // LOG: Cards being drawn
        console.log('[fillHand] Drawing cards:', newCards.map(c => `${c.id} (${c.title})`));
        // Update hand
        game.sceneCards.hands[playerName] = [...currentHand, ...newCards];
        // LOG: Hand after drawing
        console.log('[fillHand] Hand after draw:', game.sceneCards.hands[playerName].map(c => `${c.id} (${c.title})`));
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
      setPreviewCard(null);
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
          const actKey = `act ${nextAct}`;
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
          <SceneCardItem
            key={card.id}
            card={card}
            playerCharacters={playerCharacters}
            isPlaying={actioningCards.has(card.id)}
            canPlay={gameState?.gameStarted && gameState.currentDirector === playerName}
            onPlay={() => {
              if (gameState?.gameStarted && gameState.currentDirector === playerName) {
                setPreviewCard(card);
              }
            }}
          />
        ))}
      </ul>

      <DeckStatusBox deckStatus={deckStatus} currentAct={currentAct} />

      {previewCard && !showDirector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className={`theme-${theme} bg-card text-card-foreground rounded-xl shadow-lg max-w-lg w-full p-8 relative`}>
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              onClick={() => setPreviewCard(null)}
              aria-label="Lukk"
            >
              ×
            </button>
            <div className="absolute top-2 left-2 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowDirector(true)}
                title="Regissør"
              >
                <Users className="h-5 w-5" />
              </Button>
              {(previewCard.type && ['relationship', 'goal'].includes(previewCard.type.toLowerCase())) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={async () => {
                    const foringer = await getForingerByTypeAndAct(previewCard.type, currentAct, true);
                    setForingerList(foringer);
                    setShowForinger(true);
                  }}
                  title="Føringer"
                >
                  <ClipboardList className="h-5 w-5" />
                </Button>
              )}
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold font-cinzel tracking-wide text-[#e0d6b9] mb-2">{previewCard.title}</h3>
              {previewCard.text && (
                <p className="text-lg font-garamond text-[#e7e5e4] leading-relaxed mb-6 whitespace-pre-line">{previewCard.text}</p>
              )}
              {previewCard.type && (
                <p className="text-base text-muted-foreground mb-2">Type: {previewCard.type}</p>
              )}
              {previewCard.playerId && (
                <p className="text-base text-muted-foreground mb-4">Rolle: {playerCharacters[previewCard.playerId.toLowerCase()]}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setPreviewCard(null)}
                className="font-semibold w-full"
              >
                Angre
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={() => playCard(previewCard.id)}
                className="font-semibold w-full"
                disabled={actioningCards.has(previewCard.id)}
              >
                {actioningCards.has(previewCard.id) ? 'Spiller...' : 'Scenen er ferdig'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showDirector && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-100">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              onClick={() => setShowDirector(false)}
              aria-label="Lukk"
            >
              ×
            </button>
            <Director />
          </div>
        </div>
      )}

      {showForinger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className={`theme-${theme} bg-card text-card-foreground rounded-xl shadow-lg max-w-xl w-full p-8 relative overflow-y-auto max-h-[90vh]`}>
            <button
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-2xl font-bold"
              onClick={() => setShowForinger(false)}
              aria-label="Lukk"
            >
              ×
            </button>
            <h2 className="text-xl font-bold font-cinzel tracking-wide text-primary mb-6">Føringer for {previewCard?.type}</h2>
            <div className="space-y-4">
              {[1,2,3].map(actNum => (
                <div key={actNum} 
                  className={`rounded-lg p-4 ${
                    currentAct === actNum 
                    ? 'bg-muted border border-border' 
                    : 'bg-background'
                  }`}
                >
                  <h3 className={`font-cinzel tracking-wide mb-3 ${
                    currentAct === actNum 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                  }`}>
                    Akt {actNum}{currentAct === actNum ? ' (nåværende)' : ''}
                  </h3>
                  <div className="space-y-2">
                    {foringerList.acts[actNum]?.length > 0 ? (
                      foringerList.acts[actNum].map((f, i) => (
                        <p key={i} className="text-card-foreground font-garamond leading-relaxed pl-4 border-l-2 border-border">{f}</p>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic pl-4">Ingen føringer for denne akt</p>
                    )}
                  </div>
                </div>
              ))}
              {foringerList.veien.length > 0 && (
                <div className="rounded-lg p-4 bg-muted/50 border border-destructive/20">
                  <h3 className="font-cinzel tracking-wide mb-3 text-destructive">I veien for Endringen</h3>
                  <div className="space-y-2">
                    {foringerList.veien.map((f, i) => (
                      <p key={i} className="text-card-foreground font-garamond leading-relaxed pl-4 border-l-2 border-destructive/20">{f}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 