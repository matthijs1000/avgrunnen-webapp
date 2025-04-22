import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function AvgrunnenApp() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playedCards, setPlayedCards] = useState([]);

  useEffect(() => {
    const cardsRef = ref(database, "game/cards");
    const unsubscribe = onValue(cardsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setCards(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const playedRef = ref(database, "game/played");
    const unsubscribe = onValue(playedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sorted = Object.entries(data)
          .sort((a, b) => a[0] - b[0])
          .map(([, value]) => value);
        setPlayedCards(sorted);
      }
    });
    return () => unsubscribe();
  }, []);

  const playCard = () => {
    const playedCard = cards[currentIndex];
    const playedRef = ref(database, `game/played/${Date.now()}`);
    set(playedRef, playedCard);
  };

  const nextCard = () => setCurrentIndex((i) => (i + 1) % cards.length);
  const prevCard = () => setCurrentIndex((i) => (i - 1 + cards.length) % cards.length);

  return (
    <div className="min-h-screen bg-[#e8f0ea] text-gray-900 font-sans pb-20">
      <Tabs defaultValue="kort" className="w-full max-w-md mx-auto p-4">
        <TabsContent value="kort" className="mt-4">
          <Card className="text-center">
            <CardContent className="p-4">
              {cards.length > 0 && (
                <div className="text-lg font-bold mb-2">{cards[currentIndex]}</div>
              )}
              <div className="flex justify-center gap-4">
                <Button onClick={prevCard}>Forrige</Button>
                <Button onClick={nextCard}>Neste</Button>
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" onClick={playCard}>Spill kort</Button>
              </div>
            </CardContent>
          </Card>

          {playedCards.length > 0 && (
            <div className="mt-6">
              <h2 className="text-center font-bold">Spilte kort</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {playedCards.map((card, i) => (
                  <li key={i} className="text-center text-gray-700">{card}</li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="kart" className="mt-4">
          <div className="text-center">
            <p className="mb-2">Lokasjoner (eks):</p>
            <ul className="list-disc list-inside">
              <li>Det forlatte hotellet</li>
              <li>Tårnet i skogen</li>
              <li>Den sunkne byen</li>
            </ul>
            <img src="/map-placeholder.png" alt="Kart" className="mt-4 w-full rounded" />
          </div>
        </TabsContent>

        <TabsContent value="regler" className="mt-4">
          <iframe
            src="https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit"
            className="w-full h-[500px] border"
            title="Regler"
          ></iframe>
        </TabsContent>

        <TabsContent value="roller" className="mt-4">
          <div className="text-center">
            <p className="mb-2">Sveip mellom roller (eksempel):</p>
            <Card className="mb-2"><CardContent className="p-4">Rolle 1: Maria, kultist</CardContent></Card>
            <Card className="mb-2"><CardContent className="p-4">Rolle 2: Johan, etterforsker</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="regissor" className="mt-4">
          <div className="text-left px-2">
            <h2 className="text-lg font-bold mb-2">Føringer:</h2>
            <ul className="list-disc list-inside">
              <li>Mørk og mystisk stemning</li>
              <li>Slow horror</li>
              <li>Ingen actionklisjeer</li>
            </ul>
            <h2 className="text-lg font-bold mt-4 mb-2">Checklist:</h2>
            <ul className="list-inside">
              <li><input type="checkbox" /> Alle har spilt et kort</li>
              <li><input type="checkbox" /> Trusselen er introdusert</li>
              <li><input type="checkbox" /> Akten er avsluttet</li>
            </ul>
          </div>
        </TabsContent>

        <TabsList className="fixed bottom-0 left-0 right-0 flex justify-around bg-white border-t shadow-md">
          <TabsTrigger value="kort">Kort</TabsTrigger>
          <TabsTrigger value="kart">Kart</TabsTrigger>
          <TabsTrigger value="regler">Regler</TabsTrigger>
          <TabsTrigger value="roller">Roller</TabsTrigger>
          <TabsTrigger value="regissor">Regissør</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
