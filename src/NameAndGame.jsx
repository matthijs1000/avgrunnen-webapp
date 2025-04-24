
import React, { useState } from "react"

export default function NameAndGame({ onSubmit }) {
  const [name, setName] = useState("")
  const [gameId, setGameId] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    localStorage.setItem("name", name)
    localStorage.setItem("gameId", gameId)
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
