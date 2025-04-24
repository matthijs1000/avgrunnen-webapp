import React from 'react';

export default function RegissorTab() {
  const checklist = [
    'Les scenekortet høyt.',
    'Hvis Mål/Relasjon: Velg Føring fra Føring-kort, spør evt gruppa.',
    'Velg et sted.',
    'Beskriv stedet hovedrollen er, folkene der, og situasjonen de er i.',
    'Velg en annen spiller til å spille birollen fra scenekortet.',
    'Del ut eller spill evt andre biroller.',
    'Gjør Føringen konkret. Instruer spillerne, mye eller lite.',
    'Gi ordet til de andre, og la dem spille.',
    'Styr med lett hånd. Følg Føringen du valgte.',
    'Avslutt scenen når du vil.',
    'Gi Mysteriestatus hvis relevant.',
    'Skriv referat.'
  ];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Regissør Sjekkliste</h1>
      <div className="bg-white rounded-lg shadow-sm">
        <ul className="divide-y divide-gray-100">
          {checklist.map((item, index) => (
            <li 
              key={index}
              className="p-4 hover:bg-gray-50 flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                {index + 1}
              </div>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 