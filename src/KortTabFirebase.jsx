import { useEffect, useState } from 'react';
import { db } from './firebaseConfig';
import {
  ref,
  get,
  set,
  runTransaction,
  child,
} from 'firebase/database';

// Initial cards deck
const initialCards = [
  { id: '1', title: 'Mørket kommer', text: 'Alt lys slukner. En rå frykt brer seg.' },
  { id: '2', title: 'Et tap', text: 'Du mister noe dyrebart – eller noen.' },
  { id: '3', title: 'Fristelse', text: 'Noe du ønsker ligger foran deg. Men hva koster det?' },
  { id: '4', title: 'Skjult viten', text: 'Du får innblikk i noe som ikke var ment for deg.' },
  { id: '5', title: 'Den sanne fienden', text: 'En venn viser seg å være noe helt annet.' },
  { id: '6', title: 'Et nytt valg', text: 'Du står ved en korsvei. Du må velge – og velger feil.' }
];

export default function KortTabFirebase() {
  const [hand, setHand] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const playerName = localStorage.getItem('name');
  const gameId = localStorage.getItem('gameId');

  console.log('🧠 Spiller:', playerName);
  console.log('🧠 Aktiv gameId:', gameId);

  // Initialize game if needed
  const initializeGameIfNeeded = async () => {
    try {
      const gameSnapshot = await get(ref(db, `games/${gameId}`));
      if (!gameSnapshot.exists()) {
        await set(ref(db, `games/${gameId}`), {
          cards: initialCards,
          discard: [],
          hands: {}
        });
        console.log('🎲 Initialized new game with cards');
      }
    } catch (err) {
      console.error('Failed to initialize game:', err);
      setError('Kunne ikke koble til spillet. Sjekk internett-tilkoblingen.');
    }
  };

  const drawCard = async () => {
    setIsLoading(true);
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game) return null;

        const allCards = game.cards || [];
        const discard = game.discard || [];
        const playerHand = game.hands?.[playerName] || [];

        const playedOrHeldIds = new Set([
          ...Object.values(game.hands || {}).flat().map(card => card.id),
          ...(game.discard || []).map(card => card.id),
        ]);
        
        const available = allCards.filter((card) => !playedOrHeldIds.has(card.id));

        console.log('▶️ Forsøker å trekke kort. Tilgjengelige kort:', available.length);

        if (available.length === 0 && discard.length > 0) {
          console.log('♻️ Stokker discard tilbake i bunken');
          available.push(...discard);
          game.discard = [];
        }

        if (available.length === 0) {
          console.warn('🚫 Ingen kort tilgjengelig');
          return game;
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        const drawnCard = available[randomIndex];

        game.hands = game.hands || {};
        game.hands[playerName] = [...(game.hands[playerName] || []), drawnCard];

        return game;
      });
      
      await loadHand();
    } catch (err) {
      console.error('Failed to draw card:', err);
      setError('Kunne ikke trekke kort. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const discardCard = async (cardId) => {
    setIsLoading(true);
    try {
      await runTransaction(ref(db, `games/${gameId}`), (game) => {
        if (!game || !game.hands?.[playerName]) return game;

        const playerHand = game.hands[playerName] || [];
        const updatedHand = playerHand.filter((c) => c.id !== cardId);
        const discardedCard = playerHand.find((c) => c.id === cardId);

        if (!discardedCard) return game;

        // Move card to discard pile
        game.hands[playerName] = updatedHand;
        game.discard = [...(game.discard || []), discardedCard];

        // Draw a new card immediately
        const allCards = game.cards || [];
        const playedOrHeldIds = new Set([
          ...Object.values(game.hands || {}).flat().map(card => card.id),
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

  const loadHand = async () => {
    try {
      const snap = await get(ref(db, `games/${gameId}/hands/${playerName}`));
      const val = snap.val() || [];
      console.log('✍️ Henter starthånd:', val);
      setHand(val);
      setError(null);
    } catch (err) {
      console.error('Failed to load hand:', err);
      setError('Kunne ikke laste inn hånden din. Prøv å laste siden på nytt.');
    }
  };

  const resetGame = async () => {
    setIsLoading(true);
    try {
      await set(ref(db, `games/${gameId}`), {
        cards: initialCards,
        discard: [],
        hands: {}
      });
      console.log('🔄 Reset game to initial state');
      await loadHand();
      setShowResetConfirm(false);
    } catch (err) {
      console.error('Failed to reset game:', err);
      setError('Kunne ikke tilbakestille spillet. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const setup = async () => {
      setIsLoading(true);
      try {
        await initializeGameIfNeeded();
        await loadHand();
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
      <h2 className="text-xl font-bold mb-4">Hånden din</h2>
      {isLoading ? (
        <p>Laster...</p>
      ) : (
        <>
          <ul className="space-y-2 mb-4">
            {hand.map((card) => (
              <li key={card.id} className="p-3 bg-white rounded shadow">
                <h3 className="font-medium">{card.title}</h3>
                {card.text && <p className="text-sm text-gray-600 mt-1">{card.text}</p>}
                <button 
                  onClick={() => discardCard(card.id)}
                  className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  Kast
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <button 
              onClick={drawCard}
              disabled={isLoading}
              className="w-full py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading ? 'Trekker kort...' : 'Trekk kort'}
            </button>
            
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2 mt-4 bg-red-600 text-white rounded hover:bg-red-700"
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
        </>
      )}
    </div>
  );
}
