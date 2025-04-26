/**
 * @typedef {Object} DramaCard
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {string} [type]
 * @property {string} [image]
 * @property {Record<string, any>} [extra]
 */

/**
 * @typedef {Object} Turn
 * @property {string} type
 * @property {number} [turn]
 * @property {number} [act]
 * @property {number} [timestamp]
 * @property {string} [director]
 * @property {DramaCard} [dramaCard]
 * @property {Object} [dramaCards]
 * @property {number} [previousAct]
 * @property {number} [newAct]
 * @property {number} [activeCards]
 * @property {Record<string, any>} [extra]
 */

/**
 * @typedef {Object} DramaCardsState
 * @property {DramaCard[]} cards
 * @property {Record<string, DramaCard[]>} hands
 * @property {Object} played
 * @property {Object} [discarded]
 */

/**
 * @typedef {Object} GameState
 * @property {DramaCardsState} [dramaCards]
 * @property {Turn[]} [turnHistory]
 * @property {Record<string, any>} [extra]
 */ 