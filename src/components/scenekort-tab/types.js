/**
 * @typedef {Object} SceneCard
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {string} [type]
 * @property {string} [playerId]
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