import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { db } from './firebaseConfig';
import { ref, onValue } from 'firebase/database';

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
            <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm0-9a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" />
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

export default function RollerTab({ gameState }) {
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    if (!gameState?.players || !gameState?.sceneCards?.cards) return;

    console.log('🎮 Game State:', gameState);
    
    // Get all players and their characters
    const players = Object.entries(gameState.players).map(([playerName, data]) => ({
      name: playerName,
      character: data.character || playerName
    }));
    console.log('👥 Players:', players);

    // Get all scene cards
    const sceneCards = gameState.sceneCards.cards || [];
    console.log('🎴 All Scene Cards:', sceneCards.map(card => ({
      title: card.title,
      playerId: card.playerId
    })));

    // Group scene cards by player
    const charactersWithCards = players.map(player => {
      console.log(`\n🎭 Processing player: ${player.name}`);
      
      // Filter cards by case-insensitive playerId match
      const playerCards = sceneCards.filter(card => {
        const matches = card.playerId?.toLowerCase() === player.name.toLowerCase();
        console.log(`Card ${card.title} playerId: ${card.playerId}, player name: ${player.name}, matches: ${matches}`);
        return matches;
      });

      // Sort cards by type in the specified order
      const sortedCards = playerCards.sort((a, b) => {
        const typeOrder = {
          'goal': 1,
          'relationship': 2,
          'exploration': 3,
          'plan': 4
        };
        
        const typeA = (a.type || '').toLowerCase();
        const typeB = (b.type || '').toLowerCase();
        
        const orderA = typeOrder[typeA] || 999;
        const orderB = typeOrder[typeB] || 999;
        
        return orderA - orderB;
      });

      console.log(`Found ${sortedCards.length} cards for ${player.name}:`, 
        sortedCards.map(c => ({ title: c.title, type: c.type, playerId: c.playerId }))
      );

      return {
        ...player,
        cards: sortedCards
      };
    });

    console.log('🎯 Final character assignments:', charactersWithCards.map(c => ({
      name: c.name,
      character: c.character,
      cardCount: c.cards.length,
      cards: c.cards.map(card => card.title)
    })));

    setCharacters(charactersWithCards);
  }, [gameState]);

  if (!characters.length) {
    return (
      <div className="text-center p-4">
        <p>Ingen roller registrert ennå.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {characters.map((character, index) => (
        <Card key={index} className="mb-4">
          <CardContent className="p-4">
            <div className="font-bold text-lg mb-2">
              {character.character}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              Spiller: {character.name}
            </div>
            {character.cards.length > 0 ? (
              <div className="mt-2">
                <div className="text-sm font-semibold mb-1">Scenekort:</div>
                <ul className="space-y-3">
                  {character.cards.map((card, cardIndex) => (
                    <li key={cardIndex} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeIcon type={card.type} />
                        <span className="font-medium">{card.title}</span>
                      </div>
                      {card.text && (
                        <p className="text-sm text-gray-600 mt-1">
                          {card.text}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-gray-500 mt-2">
                Ingen scenekort ennå
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 