import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";

export default function RulesTab() {
  const [iframeHeight, setIframeHeight] = useState('500px');
  const baseUrl = 'https://docs.google.com/document/d/1DzGr01yskVG8kfF8ubtbCikPLGAiUiXLyd2faI6u6gY';

  // Adjust iframe height based on window size
  useEffect(() => {
    const updateHeight = () => {
      const height = window.innerHeight - 200;
      setIframeHeight(`${height}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.open(baseUrl + '/edit', '_blank')}
        >
          Åpne i Google Docs
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <iframe
          src={`${baseUrl}/edit?embedded=true`}
          className="w-full border-0"
          style={{ height: iframeHeight }}
          title="Regler"
        />
      </div>
    </div>
  );
} 