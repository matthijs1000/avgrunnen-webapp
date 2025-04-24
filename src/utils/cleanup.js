import { db } from '../firebaseConfig';
import { ref, set } from 'firebase/database';

export async function cleanupGame(gameId) {
  try {
    // Reset the entire game structure but keep the cards
    await set(ref(db, `games/${gameId}/players`), null);
    await set(ref(db, `games/${gameId}/hands`), null);
    await set(ref(db, `games/${gameId}/played`), null);
    
    console.log('🧹 Cleaned up game:', gameId);
    console.log('✨ You can now sign in with new players');
    
    // Clear local storage
    localStorage.clear();
    
    // Reload the page to reset the app state
    window.location.reload();
  } catch (err) {
    console.error('Failed to cleanup game:', err);
    throw err;
  }
} 