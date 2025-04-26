import React from 'react';

export function GameStatusBar({ gameState }) {
  // Handle loading state
  if (!gameState) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-gray-800 shadow-lg border-b border-gray-700">
          <div className="container mx-auto px-4 py-2">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-gray-300">
                <span className="font-semibold">Akt:</span> -
              </div>
              <div className="text-gray-300">
                <span className="font-semibold">Runde:</span> -
              </div>
              <div className="text-gray-300">
                <span className="font-semibold">Regissør:</span> -
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract values with proper fallbacks
  const currentAct = gameState.sceneCards?.currentAct || 1;
  const currentTurn = gameState.currentTurn || 1;
  const currentDirector = gameState.currentDirector;
  
  // Get director's character name
  let directorDisplay = 'Ikke valgt';
  if (currentDirector && gameState.players?.[currentDirector]) {
    directorDisplay = gameState.players[currentDirector].character || currentDirector;
  }

  // Only show director if game has started
  if (!gameState.gameStarted) {
    directorDisplay = 'Venter på start';
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="container mx-auto px-4 py-2">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-gray-300">
              <span className="font-semibold">Akt:</span> {currentAct}
            </div>
            <div className="text-gray-300">
              <span className="font-semibold">Runde:</span> {currentTurn}
            </div>
            <div className="text-gray-300">
              <span className="font-semibold">Regissør:</span> {directorDisplay}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 