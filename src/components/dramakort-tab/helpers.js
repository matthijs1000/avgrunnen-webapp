/**
 * Shuffle an array in place (Fisher-Yates)
 * @param {Array} array
 * @returns {Array}
 */
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Get all available drama cards (not in any hand)
 * @param {Array} allCards
 * @param {Set<string>} playedCardIds
 * @returns {Array}
 */
export function getAvailableDramaCards(allCards, playedCardIds) {
  return allCards.filter(card => !playedCardIds.has(card.id));
}

/**
 * Get all played drama card IDs from hands
 * @param {Object} allHands
 * @returns {Set<string>}
 */
export function getPlayedDramaCardIds(allHands) {
  return new Set(
    Object.values(allHands)
      .flat()
      .map(card => card.id)
  );
} 