import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function RulesTab() {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch('https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/export?format=html');
        if (!response.ok) throw new Error('Failed to fetch rules');
        const html = await response.text();
        setContent(html);
      } catch (err) {
        setError('Kunne ikke laste reglene. Sjekk internett-tilkoblingen.');
        console.error('Error fetching rules:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRules();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button
          variant="outline"
          onClick={() => window.open('https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit', '_blank')}
        >
          Åpne regler i Google Docs
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Spilleregler</h1>
        <Button
          variant="outline"
          onClick={() => window.open('https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY/edit', '_blank')}
        >
          Åpne i Google Docs
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </CardContent>
      </Card>
    </div>
  );
} 