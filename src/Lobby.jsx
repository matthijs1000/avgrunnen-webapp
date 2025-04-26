import React, { useState, useEffect } from "react";
import { ref, onValue, runTransaction } from "firebase/database";
import { db } from "./firebaseConfig";
import { PLAYER_OPTIONS, GROUP_NAME } from "./constants";

// Log when the module is loaded
console.log('[Lobby module] Loaded');

export default function Lobby({ onReady, onRegister }) {
  const [selected, setSelected] = useState("");
  const [players, setPlayers] = useState({});
  const [gameStarted, setGameStarted] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showJoinMessage, setShowJoinMessage] = useState(false);

  // Log when the component mounts/unmounts
  useEffect(() => {
    console.log('[Lobby] MOUNT');
    return () => {
      console.log('[Lobby] UNMOUNT');
    };
  }, []);

  // Log when the window is reloaded
  useEffect(() => {
    const onBeforeUnload = () => {
      console.log('[Lobby] Window is unloading/reloading');
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Patch localStorage.clear to log when called
  useEffect(() => {
    const origClear = localStorage.clear;
    localStorage.clear = function() {
      console.log('[Lobby] localStorage.clear() called');
      return origClear.apply(this, arguments);
    };
    return () => {
      localStorage.clear = origClear;
    };
  }, []);

  // Debug: log relevant state on every render
  console.log("[Lobby render] localStorage name:", localStorage.getItem("name"));
  console.log("[Lobby render] selected:", selected);
  console.log("[Lobby render] players:", players);

  // Listen for player list and gameStarted
  useEffect(() => {
    const groupRef = ref(db, `games/${GROUP_NAME}`);
    const unsub = onValue(groupRef, (snap) => {
      const data = snap.val() || {};
      setPlayers(data.players || {});
      setGameStarted(!!data.gameStarted);
      if (data.gameStarted) onReady();
    });
    return () => unsub();
  }, [onReady]);

  // Register player
  const handleJoin = async () => {
    console.log("[handleJoin] selected:", selected);
    if (!selected) return;
    const prevName = localStorage.getItem("name");
    // Remove previous player slot if it exists and is different
    if (prevName && prevName !== selected) {
      await runTransaction(ref(db, `games/${GROUP_NAME}/players/${prevName}`), () => null);
    }
    const { character } = PLAYER_OPTIONS.find(p => p.name === selected);
    await runTransaction(ref(db, `games/${GROUP_NAME}/players/${selected}`), (current) => {
      if (current) return current; // Already joined
      return { character, joinedAt: Date.now() };
    });
    localStorage.setItem("name", selected);
    localStorage.setItem("character", character);
    localStorage.setItem("gameId", GROUP_NAME);
    // Force re-render to enable 'Start uten alle' button
    setSelected(selected);
    setShowJoinMessage(false);
    console.log("[handleJoin] localStorage name after join:", localStorage.getItem("name"));
    if (onRegister) {
      onRegister(GROUP_NAME);
    }
  };

  // Start game even if not all players are present
  const handleForceStart = async () => {
    const myName = localStorage.getItem("name");
    if (!myName) {
      alert("Du må velge et navn før du kan starte spillet.");
      return;
    }
    setStarting(true);
    await runTransaction(ref(db, `games/${GROUP_NAME}`), (game) => {
      if (!game) return game;
      game.gameStarted = true;
      return game;
    });
    setStarting(false);
  };

  // Start game
  const handleStart = async () => {
    await runTransaction(ref(db, `games/${GROUP_NAME}`), (game) => {
      if (!game) return game;
      game.gameStarted = true;
      return game;
    });
  };

  // Reset all players
  const handleReset = async () => {
    setResetting(true);
    await runTransaction(ref(db, `games/${GROUP_NAME}`), (game) => {
      if (!game) return game;
      game.players = {};
      game.gameStarted = false;
      return game;
    });
    setResetting(false);
    localStorage.clear();
    setSelected("");
    setShowJoinMessage(true);
  };

  const allJoined = PLAYER_OPTIONS.every(p => players[p.name]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black/80 text-white">
      <h1 className="text-2xl font-bold mb-6">Lobby: De La Cruz</h1>
      <div className="mb-4">
        {(!selected || !localStorage.getItem("name") || showJoinMessage) && (
          <div className="mb-2 text-yellow-300 text-sm font-semibold">
            Velg navn og trykk 'Bli med' før du starter spillet.
          </div>
        )}
        <label className="block mb-2">Velg ditt navn:</label>
        <select
          value={selected}
          onChange={e => {
            setSelected(e.target.value);
            setShowJoinMessage(false);
          }}
          className="text-black px-4 py-2 rounded"
        >
          <option value="">Velg...</option>
          {PLAYER_OPTIONS.filter(p => !players[p.name]).map(p => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className="ml-4 px-4 py-2 bg-blue-700 rounded text-white"
          onClick={handleJoin}
          disabled={!selected || !!players[selected]}
        >
          Bli med
        </button>
      </div>
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Spillere:</h2>
        <ul>
          {PLAYER_OPTIONS.map(p => (
            <li key={p.name}>
              {p.name} {players[p.name] ? `→ ${p.character}` : ""}
            </li>
          ))}
        </ul>
      </div>
      {!gameStarted && (
        <button
          className="mb-2 px-4 py-2 bg-yellow-700 rounded text-white font-bold"
          onClick={handleForceStart}
          disabled={starting || !localStorage.getItem("name")}
        >
          {starting ? 'Starter...' : 'Start uten alle'}
        </button>
      )}
      {localStorage.getItem("name") && (
        <div className="mb-2 text-green-300 text-sm font-semibold">Du er med!</div>
      )}
      {Object.keys(players).length > 0 && (
        <button
          className="mb-4 px-4 py-2 bg-red-700 rounded text-white font-bold"
          onClick={handleReset}
          disabled={resetting}
        >
          {resetting ? 'Tilbakestiller...' : 'Reset'}
        </button>
      )}
      {allJoined && !gameStarted && (
        <button
          className="px-6 py-3 bg-green-700 rounded text-white text-lg font-bold"
          onClick={handleStart}
        >
          Start spillet
        </button>
      )}
      {gameStarted && <div className="mt-4 text-green-400">Det er et aktivt spill i gang.</div>}
    </div>
  );
} 