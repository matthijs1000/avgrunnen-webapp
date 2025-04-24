import React, { useState } from "react"
import { db } from './firebaseConfig';
import { ref, set } from 'firebase/database';

export default function NameAndGame({ onSubmit }) {
  const [name, setName] = useState("")
  const [gameId, setGameId] = useState("")
  const [character, setCharacter] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Store in localStorage
    localStorage.setItem("name", name)
    localStorage.setItem("gameId", gameId)
    localStorage.setItem("character", character)
    
    // Store in Firebase
    await set(ref(db, `games/${gameId}/players/${name}`), {
      character: character
    });
    
    onSubmit({ name, gameId })
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Velkommen til Avgrunnen</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Navn:</label>
          <input
            className="border p-2 rounded w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Karakternavn:</label>
          <input
            className="border p-2 rounded w-full"
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            required
            placeholder="F.eks. Adele"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Game ID:</label>
          <input
            className="border p-2 rounded w-full"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="bg-black text-white px-4 py-2 rounded">
          Start
        </button>
      </form>
    </div>
  )
}
