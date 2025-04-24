import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NameAndGame from "./NameAndGame";
import KortTabFirebase from "./KortTabFirebase";
import RulesTab from "./RulesTab";
import RegissorTab from "./RegissorTab";
import ScenekortTab from "./ScenekortTab";

export default function AvgrunnenApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("name");
    const gameId = localStorage.getItem("gameId");
    console.log("Laster fra localStorage:", { name, gameId });
    if (name && gameId) setReady(true);
  }, []);

  const handleSubmit = ({ name, gameId }) => {
    localStorage.setItem("name", name);
    localStorage.setItem("gameId", gameId);
    setReady(true);
  };

  return (
    <div className="min-h-screen bg-[#e8f0ea] text-gray-900 font-sans pb-20">
      {!ready ? (
        <NameAndGame onSubmit={handleSubmit} />
      ) : (
        <Tabs defaultValue="dramakort" className="w-full max-w-md mx-auto p-4">
          <TabsContent value="dramakort">
            <KortTabFirebase />
          </TabsContent>

          <TabsContent value="scenekort" className="mt-4">
            <ScenekortTab />
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
            <RulesTab />
          </TabsContent>

          <TabsContent value="roller" className="mt-4">
            <div className="text-center">
              <p className="mb-2">Roller (eksempel):</p>
              <Card className="mb-2"><CardContent className="p-4">Rolle 1: Maria, kultist</CardContent></Card>
              <Card className="mb-2"><CardContent className="p-4">Rolle 2: Johan, etterforsker</CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="regissor" className="mt-4">
            <RegissorTab />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 flex justify-around bg-white border-t shadow-md">
            <TabsTrigger value="dramakort">Dramakort</TabsTrigger>
            <TabsTrigger value="scenekort">Scenekort</TabsTrigger>
            <TabsTrigger value="kart">Kart</TabsTrigger>
            <TabsTrigger value="regler">Regler</TabsTrigger>
            <TabsTrigger value="roller">Roller</TabsTrigger>
            <TabsTrigger value="regissor">Regissør</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
