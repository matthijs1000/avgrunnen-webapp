import React from 'react';
/**
 * @param {Object} props
 * @param {Array} props.turnHistory
 */
export function TurnLog({ turnHistory }) {
  if (!turnHistory || turnHistory.length === 0) {
    return <p className="text-gray-500 text-center">Ingen trekk spilt ennå</p>;
  }
  return (
    <div className="space-y-4">
      {[...turnHistory].reverse().map((turn, index) => (
        <div key={turn.timestamp || index} className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="font-semibold">
              {turn.type === 'act_progression' ? `Akt ${turn.previousAct} → ${turn.newAct}` : `Runde ${turn.turn} (Akt ${turn.act})`}
            </div>
            <div className="text-sm text-gray-500">
              {turn.timestamp ? new Date(turn.timestamp).toLocaleString('no-NO') : ''}
            </div>
          </div>
          <div className="text-sm space-y-2">
            {turn.type !== 'act_progression' && (
              <>
                <div>
                  <span className="font-medium">Regissør:</span> {turn.director}
                </div>
                <div>
                  <span className="font-medium">Scenekort:</span> {turn.sceneCard?.title}
                  <span className="text-gray-500 ml-1">({turn.sceneCard?.type})</span>
                </div>
                {turn.dramaCards?.played?.length > 0 && (
                  <div>
                    <span className="font-medium">Dramakort spilt:</span>
                    <ul className="ml-4 list-disc">
                      {turn.dramaCards.played.map((card, cardIndex) => (
                        <li key={card.timestamp || `${turn.timestamp}-${cardIndex}`}>
                          {card.title} <span className="text-gray-500">av {card.playedBy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {turn.dramaCards?.discarded?.length > 0 && (
                  <div>
                    <span className="font-medium">Dramakort forkastet:</span>
                    <ul className="ml-4 list-disc">
                      {turn.dramaCards.discarded.map((card, cardIndex) => (
                        <li key={card.timestamp || `${turn.timestamp}-${cardIndex}`}>
                          {card.title} <span className="text-gray-500">av {card.discardedBy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {turn.type === 'act_progression' && (
              <div>
                <p>Akten er endret fra {turn.previousAct} til {turn.newAct}</p>
                <p className="text-gray-500 mt-1">{turn.activeCards} nye kort er aktivert</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 