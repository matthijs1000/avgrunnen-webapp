import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NameAndGame from "./NameAndGame";
import KortTabFirebase from "./KortTabFirebase";

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
        <Tabs defaultValue="kort" className="w-full max-w-md mx-auto p-4">
          <TabsContent value="kort">
            <KortTabFirebase />
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
              <p className="mb-2">Roller (eksempel):</p>
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
      )}
    </div>
  );
}
