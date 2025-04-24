import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function RegissorTab() {
  const checklist = [
    {
      text: 'Les scenekortet høyt.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.1fob9te',
      summary: 'Les opp scenekortet tydelig for alle spillere, hver gang det blir spilt. Dette setter rammen for scenen som skal spilles.'
    },
    {
      text: 'Hvis Mål/Relasjon: Velg Føring fra Føring-kort, spør evt gruppa.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.3znysh7',
      summary: 'For Mål- og Relasjonsscener: Velg en Føring fra Føring-kortene. Tallene viser hvilken akt de kan passe til, men du velger fritt. Du kan spørre gruppen om forslag hvis du ønsker.'
    },
    {
      text: 'Velg et sted.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.2et92p0',
      summary: 'Bestem hvor på kartet scenen skal foregå. Husk at hver lokasjon kan inneholde mye forskjellig.'
    },
    {
      text: 'Beskriv stedet hovedrollen er, folkene der, og situasjonen de er i.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.2et92p0',
      summary: 'Gi en tydelig beskrivelse av miljøet, hvem som er tilstede, og hva som skjer. Dette hjelper spillerne å visualisere scenen.'
    },
    {
      text: 'Velg en annen spiller til å spille birollen fra scenekortet.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.tyjcwt',
      summary: 'Velg en spiller som ikke har hovedrollen til å spille birollen som er beskrevet på scenekortet.'
    },
    {
      text: 'Del ut eller spill evt andre biroller.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.tyjcwt',
      summary: 'Hvis det er flere biroller i scenen, kan du enten dele dem ut til andre spillere eller spille dem selv.'
    },
    {
      text: 'Gjør Føringen konkret. Instruer spillerne, mye eller lite.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.3znysh7',
      summary: 'Gjør Føringen konkret ved å gi tydelige instruksjoner til spillerne. Sørg for at de vet akkurat hva de skal gjøre, med mindre dere blir enige om at de skal overta ansvar for føringen underveis.'
    },
    {
      text: 'Gi ordet til de andre, og la dem spille.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.1t3h5sf',
      summary: 'Overlat scenen til spillerne og la dem utforske karakterene sine og situasjonen.'
    },
    {
      text: 'Styr med lett hånd. Følg Føringen du valgte.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.3znysh7',
      summary: 'Bli med i scenen når nødvendig, men la spillerne ha mesteparten av kontrollen. Hold deg til den valgte Føringen.'
    },
    {
      text: 'Avslutt scenen når du vil.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.1t3h5sf',
      summary: 'Avslutt scenen når du føler den har nådd et naturlig punkt eller når du ønsker å gå videre.'
    },
    {
      text: 'Gi Mysteriestatus hvis relevant.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.2s8eyo1',
      summary: 'Hvis hovedrollen sto i veien for Mysteriets følgere eller planer, gi dem et klistremerke med "I veien for Endringen".'
    },
    {
      text: 'Skriv referat.',
      link: 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit#heading=h.17dp8vu',
      summary: 'Dokumenter hovedpunktene fra scenen for å holde oversikt over historien og karakterutviklingen.'
    }
  ];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Regissør Sjekkliste</h1>
      <Accordion type="single" collapsible className="w-full">
        {checklist.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  {index + 1}
                </div>
                <span className="text-left">{item.text}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-9 space-y-3">
                <p className="text-gray-700">{item.summary}</p>
                <Button
                  variant="link"
                  className="text-blue-600 text-sm p-0 h-auto"
                  onClick={() => window.open(item.link, '_blank')}
                >
                  Les mer i regelboken
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
} 