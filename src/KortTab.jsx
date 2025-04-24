import React, { useState, useEffect } from 'react'

// Dummy kort-pool (erstattes med Firebase)
const allCards = [
  { id: '1', title: 'Mørket kommer', text: 'Alt lys slukner. En rå frykt brer seg.', used: false },
  { id: '2', title: 'Et tap', text: 'Du mister noe dyrebart – eller noen.', used: false },
  { id: '3', title: 'Fristelse', text: 'Noe du ønsker ligger foran deg. Men hva koster det?', used: false },
  { id: '4', title: 'Skjult viten', text: 'Du får innblikk i noe som ikke var ment for deg.', used: false },
  { id: '5', title: 'Den sanne fienden', text: 'En venn viser seg å være noe helt annet.', used: false },
  { id: '6', title: 'Et nytt valg', text: 'Du står ved en korsvei. Du må velge – og velger feil.', used: false }
]

export default function KortTab() {
  const [hand, setHand] = useState([])
  const [modalCard, setModalCard] = useState(null)
  const [cards, setCards] = useState([...allCards])

  // Trekker et tilfeldig ubrukt kort
  const drawCard = () => {
    let available = cards.filter(c => !c.used)
    if (available.length === 0) {
      const reset = cards.map(c => ({ ...c, used: false }))
      setCards(reset)
      available = reset
    }
    const drawn = available[Math.floor(Math.random() * available.length)]
    setCards(prev => prev.map(c => c.id === drawn.id ? { ...c, used: true } : c))
    return drawn
  }

  // Trekk 5 kort ved start
  useEffect(() => {
    if (hand.length === 0) {
      const newHand = []
      for (let i = 0; i < 5; i++) newHand.push(drawCard())
      setHand(newHand)
    }
  }, [])

  const handleDiscard = async (id) => {
    const newCard = drawCard() // Trekk nytt kort først
    setHand(prev => {
      const remaining = prev.filter(c => c.id !== id)
      return [...remaining, newCard]
    })
    setModalCard(null)
  }
  

  const handlePlay = (id) => {
    const played = hand.find(c => c.id === id)
    console.log('Spilt kort:', played)
    // Her kan du skrive til Firebase → played/
    handleDiscard(id)
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Dine Dramakort</h2>
      <div className="grid grid-cols-1 gap-4">
        {hand.map(card => (
          <div key={card.id} className="p-4 border rounded shadow bg-white">
            <div className="font-bold">{card.title}</div>
            <button
              onClick={() => setModalCard(card)}
              className="mt-2 text-sm text-blue-600 underline"
            >
              Vis
            </button>
          </div>
        ))}
      </div>

      {modalCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-[90%] max-w-md">
            <h3 className="text-lg font-bold mb-2">{modalCard.title}</h3>
            <p className="mb-4">{modalCard.text}</p>
            <div className="flex justify-between">
              <button onClick={() => setModalCard(null)} className="text-gray-600">Lukk</button>
              <button onClick={() => handleDiscard(modalCard.id)} className="text-yellow-700">Kast</button>
              <button onClick={() => handlePlay(modalCard.id)} className="text-green-700">Spill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
