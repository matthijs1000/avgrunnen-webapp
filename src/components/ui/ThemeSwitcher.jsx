import React from 'react';
import { useTheme } from '../../ThemeContext';

const themeDescriptions = {
  lovecraft: 'Eldritch, old-fashioned, alien, and creepy. Dark, mysterious, and arcane.',
  'russia-1984': 'Oppressive, cold, bureaucratic, and paranoid. Muted grays, cold blues, faded reds.',
  'norway-1946': 'Post-war, hopeful but austere, Scandinavian minimalism. Muted earth tones, navy, and off-white.',
  'colombia-1972': 'Warm, vibrant, tropical, and nostalgic. Sun-faded yellows, greens, and turquoise.',
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  console.log('[ThemeSwitcher] Rendered. Current theme:', theme);
  return (
    <div className="mb-6 text-left">
      <label htmlFor="theme-select" className="block font-semibold mb-1 text-sm">Tema:</label>
      <select
        id="theme-select"
        value={theme}
        onChange={e => {
          setTheme(e.target.value);
          console.log('[ThemeSwitcher] Theme changed to:', e.target.value);
        }}
        className="bg-gray-900 text-gray-100 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring"
      >
        <option value="lovecraft">Lovecraft</option>
        <option value="russia-1984">Russia 1984</option>
        <option value="norway-1946">Norway 1946</option>
        <option value="colombia-1972">Colombia 1972</option>
      </select>
      <div className="mt-2 text-xs text-gray-400 min-h-[2em]">
        {themeDescriptions[theme]}
      </div>
    </div>
  );
} 