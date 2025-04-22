import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC4J4rgn-L3iYaQgEU0o7Qj0Kw15VYG5zk",
  authDomain: "avgrunnen-85b84.firebaseapp.com",
  databaseURL: "https://avgrunnen-85b84-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "avgrunnen-85b84",
  storageBucket: "avgrunnen-85b84.firebasestorage.app",
  messagingSenderId: "1000199596801",
  appId: "1:1000199596801:web:ecaec1ae47f7e14fad0900",
  measurementId: "G-Q11EKSJGR2"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function AvgrunnenApp() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const cardsRef = ref(database, "game/cards");
    const unsubscribe = onValue(cardsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setCards(data);
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
    <Tabs defaultValue="kort" className="w-full max-w-md mx-auto p-4">
      <TabsList className="fixed bottom-0 left-0 right-0 flex justify-around bg-white border-t">
        <TabsTrigger value="kort">Kort</TabsTrigger>
        <TabsTrigger value="kart">Kart</TabsTrigger>
        <TabsTrigger value="regler">Regler</TabsTrigger>
        <TabsTrigger value="roller">Roller</TabsTrigger>
        <TabsTrigger value="regissor">Regissør</TabsTrigger>
      </TabsList>

      <TabsContent value="kort" className="mt-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-lg font-bold mb-2">{cards[currentIndex]}</div>
            <div className="flex justify-center gap-4">
              <Button onClick={prevCard}>Forrige</Button>
              <Button onClick={nextCard}>Neste</Button>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="secondary" onClick={playCard}>Spill kort</Button>
            </div>
          </CardContent>
        </Card>
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
          src="https://docs.google.com/document/d/your-doc-id-here/preview"
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
    </Tabs>
  );
}