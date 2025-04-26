import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NameAndGame from "./NameAndGame";
import KortTabFirebase from "./KortTabFirebase";
import RulesTab from "./RulesTab";
import RegissorTab from "./RegissorTab";
import ScenekortTab from "./ScenekortTab";
import RollerTab from "./RollerTab";
import AdminTab from './AdminTab';
import { GameStatusBar } from './components/ui/GameStatusBar';
import { db } from './firebaseConfig';
import { ref, get, set, onValue, runTransaction } from 'firebase/database';
import { fetchSceneCards, fetchDramaCards, testSheetAccess } from './utils/sheetsConfig';
import DramakortTab from "./DramakortTab";
import { ThemeProvider } from './ThemeContext';
import Lobby from './Lobby';
import { GROUP_NAME, PLAYER_OPTIONS } from './constants';

export default function AvgrunnenApp() {
  // All useState and useEffect hooks at the top
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPlayerRegistered, setIsPlayerRegistered] = useState(false);
  const [error, setError] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState({});

  // Initialize game data if needed
  const initializeGameData = async (gameId) => {
    try {
      setIsInitializing(true);
      setError(null);
      console.log('🎲 Starting game initialization...');
      
      // Test sheet access first
      const sheetTest = await testSheetAccess();
      
      if (sheetTest.error) {
        throw new Error(`Sheet access test failed: ${sheetTest.error}`);
      }
      
      if (!sheetTest.dramaOk || !sheetTest.sceneOk) {
        throw new Error('One or both sheets are not accessible');
      }
      
      // First, ensure player is registered
      const name = localStorage.getItem("name");
      const character = localStorage.getItem("character");
      if (!name) {
        throw new Error('No player name found');
      }

      // Fetch the list of joined players
      const groupRef = ref(db, `games/${gameId}/players`);
      const playersSnap = await get(groupRef);
      const joinedPlayers = playersSnap.exists() ? Object.entries(playersSnap.val()).map(([playerName, playerData]) => ({ name: playerName, ...playerData })) : [];
      // If the current player is not in the list, add them
      if (!joinedPlayers.find(p => p.name === name)) {
        joinedPlayers.push({ name, character: character || name, joinedAt: Date.now() });
      }
      // Sort by join time for director order
      joinedPlayers.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      const directorOrder = joinedPlayers.map(p => p.name);
      const firstDirector = directorOrder[0] || null;

      // Initialize game if needed first
      const gameRef = ref(db, `games/${gameId}`);
      const gameSnap = await get(gameRef);
      console.log('🔍 Current game state:', gameSnap.val());
      
      if (!gameSnap.exists()) {
        console.log('🆕 Creating new game...');
        // Initialize drama cards
        const dramaCards = await fetchDramaCards();
        if (dramaCards.length === 0) throw new Error('No drama cards found');
        
        // Initialize scene cards
        const allSceneCards = await fetchSceneCards();
        if (allSceneCards.length === 0) throw new Error('No scene cards found');
        
        // Filter for Act 1 cards
        const actOneCards = filterCardsByAct(allSceneCards, 1);
        
        if (actOneCards.length === 0) throw new Error('No Act 1 cards found');
        
        // Set up initial game state
        const initialPlayers = {};
        joinedPlayers.forEach(p => {
          initialPlayers[p.name] = {
            character: p.character || p.name,
            joinedAt: p.joinedAt || Date.now(),
            initialized: true
          };
        });
        const initialDramaHands = {};
        const initialSceneHands = {};
        joinedPlayers.forEach(p => {
          initialDramaHands[p.name] = [];
          initialSceneHands[p.name] = [];
        });
        const initialState = {
          dramaCards: {
            cards: dramaCards,
            hands: initialDramaHands,
            played: {}
          },
          sceneCards: {
            cards: allSceneCards,
            activeCards: actOneCards.map(card => card.id),
            hands: initialSceneHands,
            played: [],
            currentAct: 1
          },
          players: initialPlayers,
          currentTurn: 1,
          currentDirector: firstDirector,
          directorOrder: directorOrder,
          turnHistory: []
        };
        
        console.log('💾 Setting initial game state:', initialState);
        await set(gameRef, initialState);
        console.log('✅ Game initialized successfully');
      } else {
        // If game exists but needs act structure or turn tracking
        const game = gameSnap.val();
        if (game.sceneCards && (!game.sceneCards.activeCards || !game.currentTurn)) {
          console.log('🔄 Adding act structure and turn tracking to existing game...');
          await runTransaction(ref(db, `games/${gameId}`), (data) => {
            if (!data) return data;
            
            // Filter for current act (default to 1 if not set)
            const currentAct = data.sceneCards?.currentAct || 1;
            
            // Filter cards for current act
            const activeCards = filterCardsByAct(data.sceneCards?.cards || [], currentAct);
            
            if (activeCards.length === 0) {
              console.warn('⚠️ No active cards found for current act!');
            }
            
            return {
              ...data,
              sceneCards: {
                ...data.sceneCards,
                activeCards: activeCards.map(card => card.id),
                currentAct
              },
              currentTurn: data.currentTurn || 1,
              currentDirector: data.currentDirector || firstDirector,
              directorOrder: data.directorOrder || directorOrder,
              turnHistory: data.turnHistory || []
            };
          });
        }
      }

      // Then register player
      const playerRef = ref(db, `games/${gameId}/players/${name}`);
      await runTransaction(playerRef, (currentData) => {
        if (currentData === null) {
          return {
            character: character || name,
            joinedAt: Date.now(),
            initialized: true
          };
        }
        // If player exists, mark as initialized
        return {
          ...currentData,
          initialized: true
        };
      });

      // Log player object after registration
      const playerSnap = await get(playerRef);
      console.log('[App] Player object after registration:', playerSnap.val());

      // Initialize hands if needed
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game) return game;

        // Ensure drama cards hand exists
        if (!game.dramaCards?.hands?.[name]) {
          game.dramaCards = {
            ...game.dramaCards,
            hands: {
              ...game.dramaCards?.hands,
              [name]: []
            }
          };
        }

        // Ensure scene cards hand exists
        if (!game.sceneCards?.hands?.[name]) {
          game.sceneCards = {
            ...game.sceneCards,
            hands: {
              ...game.sceneCards?.hands,
              [name]: []
            }
          };
        }

        return game;
      });

      // Log hands after initialization
      const handsSnap = await get(ref(db, `games/${gameId}/dramaCards/hands`));
      console.log('[App] Drama hands after initialization:', handsSnap.val());
      const sceneHandsSnap = await get(ref(db, `games/${gameId}/sceneCards/hands`));
      console.log('[App] Scene hands after initialization:', sceneHandsSnap.val());
      
      // Set registration status after successful registration
      setIsPlayerRegistered(true);
      console.log('✨ Game initialization complete');
      return true;
    } catch (err) {
      console.error('❌ Failed to initialize game:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  };

  // Monitor game state
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    if (!name || !gameId) return;
    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const game = snapshot.val();
      if (game) {
        setGameState(game);
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitor player registration status
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    if (!name || !gameId) {
      setIsPlayerRegistered(false);
      return;
    }
    const playerRef = ref(db, `games/${gameId}/players/${name}`);
    const unsubscribe = onValue(playerRef, (snapshot) => {
      const player = snapshot.val();
      const isRegistered = player?.initialized === true;
      setIsPlayerRegistered(isRegistered);
    });
    return () => unsubscribe();
  }, []);

  // Listen for gameStarted and players in Firebase
  useEffect(() => {
    const groupRef = ref(db, `games/${GROUP_NAME}`);
    const unsub = onValue(groupRef, (snap) => {
      const data = snap.val() || {};
      setPlayers(data.players || {});
      setGameStarted(!!data.gameStarted);
    });
    return () => unsub();
  }, []);

  // Handle initial load (move this up with other hooks)
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    console.log("📝 Initial load check:", { name, gameId });
    if (!name || !gameId) {
      console.log('⏳ Waiting for name and gameId...');
      return;
    }
    // Ensure game is initialized and player is registered
    initializeGameData(gameId)
      .then(() => {
        console.log('🎮 Game and player ready');
      })
      .catch((err) => {
        console.error('❌ Initialization failed:', err);
        setError(err.message);
        localStorage.clear();
        window.location.reload();
      });
  }, []);

  // Consistency check: On mount, if localStorage has a name, check if that name is in Firebase players
  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    if (!name || !gameId) return;
    const playerRef = ref(db, `games/${gameId}/players/${name}`);
    get(playerRef).then((snap) => {
      if (!snap.exists()) {
        console.warn('[App] Local player not found in Firebase, clearing localStorage and reloading');
        localStorage.clear();
        window.location.reload();
      }
    });
  }, []);

  // Show Lobby if user has not picked a name
  const name = localStorage.getItem("name");
  if (!name) {
    return <Lobby onReady={() => setGameStarted(true)} onRegister={initializeGameData} />;
  }

  // Show Lobby if game hasn't started
  if (!gameStarted) {
    return <Lobby onReady={() => setGameStarted(true)} onRegister={initializeGameData} />;
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
        <GameStatusBar gameState={gameState} />
        <div className="w-full max-w-md mx-auto p-4 mt-12">
          <Tabs defaultValue="dramakort" className="w-full">
            <TabsContent value="dramakort">
              <DramakortTab gameState={gameState} />
            </TabsContent>
            <TabsContent value="scenekort" className="mt-4">
              {isPlayerRegistered ? (
                <ScenekortTab gameState={gameState} />
              ) : (
                <div className="text-center p-4">
                  <p>Venter på spillerregistrering...</p>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mt-2"></div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="roller" className="mt-4">
              {isPlayerRegistered ? (
                <RollerTab gameState={gameState} />
              ) : (
                <div className="text-center p-4">
                  <p>Venter på spillerregistrering...</p>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mt-2"></div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="admin" className="mt-4">
              <AdminTab gameState={gameState} />
            </TabsContent>
            <TabsList className="fixed bottom-0 left-0 right-0 flex justify-around bg-white border-t shadow-md">
              <TabsTrigger value="dramakort">Dramakort</TabsTrigger>
              <TabsTrigger value="scenekort">Scenekort</TabsTrigger>
              <TabsTrigger value="roller">Roller</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </ThemeProvider>
  );
}

// Add helper function to filter cards by act
const filterCardsByAct = (cards, actNumber) => {
  return cards.filter(card => {
    // Use correct property name with space
    const actKey = `act ${actNumber}`;
    // Log the actual card data to debug
    console.log(`🎴 Card ${card.id} data:`, card);
    console.log(`🎭 Card ${card.id} in act ${actNumber}:`, card[actKey]);
    // Convert the act value to boolean, handling both string "TRUE" and boolean true
    const isInAct = String(card[actKey] || '').toUpperCase() === "TRUE" || card[actKey] === true;
    console.log(`✨ Card ${card.id} active:`, isInAct);
    return isInAct;
  });
};
