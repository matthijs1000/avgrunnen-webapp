// Helper functions for scenekort-tab

/**
 * @param {Object} card
 * @returns {string}
 */
export function getCardPlayerId(card) {
  const id = card.playerId || '';
  return id.trim();
}

/**
 * @param {Object} card
 * @param {string} playerName
 * @returns {boolean}
 */
export function isCardOwnedByPlayer(card, playerName) {
  const id = getCardPlayerId(card);
  return id && id.toLowerCase() === playerName.toLowerCase();
}

/**
 * @param {Object} card
 * @param {string} playerName
 * @param {Set<string>} playedCards
 * @param {Array} allHandCards
 * @param {Set<string>} activeCardIds
 * @returns {boolean}
 */
export function isCardAvailableToDraw(card, playerName, playedCards, allHandCards, activeCardIds) {
  if (activeCardIds && !activeCardIds.has(card.id)) return false;
  const cardPlayerId = getCardPlayerId(card)?.toLowerCase();
  const currentPlayerName = playerName.toLowerCase();
  const notInHand = !allHandCards.some(handCard => handCard.id === card.id);
  // 
  return !playedCards.has(card.id) && notInHand && (!cardPlayerId || cardPlayerId !== currentPlayerName);
}

/**
 * @param {string} playerId
 * @returns {string}
 */
export function normalizePlayerId(playerId) {
  return playerId.toLowerCase();
}

/**
 * @param {Object} card
 * @param {string} playerName
 * @param {Set<string>} playedCards
 * @param {Array<string>} playerHand
 * @returns {boolean}
 */
export function isCardPlayable(card, playerName, playedCards, playerHand) {
  return playerHand.includes(card.id) && !playedCards.has(card.id);
} 