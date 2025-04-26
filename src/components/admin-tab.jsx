// Interfaces
/**
 * @typedef {Object} SceneCard
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {Record<string, any>} [extra]
 */

/**
 * @typedef {Object} Turn
 * @property {string} type
 * @property {number} [turn]
 * @property {number} [act]
 * @property {number} [timestamp]
 * @property {string} [director]
 * @property {SceneCard} [sceneCard]
 * @property {Object} [dramaCards]
 * @property {number} [previousAct]
 * @property {number} [newAct]
 * @property {number} [activeCards]
 * @property {Record<string, any>} [extra]
 */

/**
 * @typedef {Object} SceneCardsState
 * @property {SceneCard[]} cards
 * @property {string[]} activeCards
 * @property {Record<string, any>} hands
 * @property {any[]} played
 * @property {number} currentAct
 */

/**
 * @typedef {Object} GameState
 * @property {SceneCardsState} [sceneCards]
 * @property {Turn[]} [turnHistory]
 * @property {Record<string, any>} [extra]
 */

import { ActSelector } from './admin-tab/act-selector';
import { ResetConfirmModal } from './admin-tab/reset-confirm-modal';
import { TurnLog } from './admin-tab/turn-log';

// Helpers
function filterCardsByAct(cards, actNumber) {
  return cards.filter(card => {
    const actKey = `act ${actNumber}`;
    return String(card[actKey] || '').toUpperCase() === 'TRUE' || card[actKey] === true;
  });
}

// Exported component
export function adminTab({ gameState, fetchSceneCards, db, runTransaction, ref }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const gameId = typeof window !== 'undefined' ? localStorage.getItem('gameId') : null;

  async function resetSceneCards() {
    setIsLoading(true);
    try {
      const allSheetCards = await fetchSceneCards();
      if (allSheetCards.length === 0) throw new Error('No scene cards found in the sheet');
      const actOneCards = filterCardsByAct(allSheetCards, 1);
      if (actOneCards.length === 0) throw new Error('No cards found for Act 1');
      const resetData = {
        cards: allSheetCards,
        activeCards: actOneCards.map(card => card.id),
        hands: {},
        played: [],
        currentAct: 1,
      };
      await runTransaction(ref(db, `games/${gameId}`), game => {
        if (!game) return game;
        game.sceneCards = resetData;
        return game;
      });
      setShowResetConfirm(false);
    } catch (err) {
      setError('Kunne ikke tilbakestille scenekortene. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  }

  async function setAct(actNumber) {
    try {
      await runTransaction(ref(db, `games/${gameId}/sceneCards`), data => {
        if (!data) return data;
        const activeCards = filterCardsByAct(data.cards, actNumber);
        if (activeCards.length === 0) throw new Error(`No cards found for Act ${actNumber}`);
        data.activeCards = activeCards.map(card => card.id);
        data.currentAct = actNumber;
        data.hands = {};
        return data;
      });
    } catch (err) {
      setError('Kunne ikke sette akten. Prøv igjen.');
    }
  }

  async function startGame() {
    if (!gameId) return;
    setIsStarting(true);
    try {
      await runTransaction(ref(db, `games/${gameId}`), game => {
        if (!game) return game;
        const players = Object.keys(game.players || {}).sort();
        if (players.length === 0) return game;
        const randomIndex = Math.floor(Math.random() * players.length);
        const firstDirector = players[randomIndex];
        game.directorOrder = players;
        game.currentDirector = firstDirector;
        game.gameStarted = true;
        game.currentTurn = 1;
        return game;
      });
    } finally {
      setIsStarting(false);
    }
  }

  const currentAct = gameState?.sceneCards?.currentAct || 1;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Admin</h2>
      <ActSelector currentAct={currentAct} isLoading={isLoading} onSetAct={setAct} />
      <div className="mt-8">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
          disabled={isLoading}
        >
          {isLoading ? 'Tilbakestiller...' : 'Tilbakestill scenekort'}
        </button>
      </div>
      <div className="mt-8">
        <button
          onClick={startGame}
          disabled={isStarting}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isStarting ? 'Starter spill...' : 'Start spill'}
        </button>
      </div>
      <div className="mt-4">
        <button
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Logg ut
        </button>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Spillogg</h3>
        <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
          <TurnLog turnHistory={gameState?.turnHistory} />
        </div>
      </div>
      <ResetConfirmModal
        isOpen={showResetConfirm}
        isLoading={isLoading}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={resetSceneCards}
      />
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
} 