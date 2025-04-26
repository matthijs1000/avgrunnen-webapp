import Papa from 'papaparse';

let foringerData = null;

export async function loadForinger() {
  if (foringerData) return foringerData;
  const response = await fetch('/src/foringer.csv');
  const text = await response.text();
  const parsed = Papa.parse(text, { header: true });
  foringerData = parsed.data;
  return foringerData;
}

export async function getForingerByTypeAndAct(type, act, includeVeien = true) {
  const data = await loadForinger();
  const acts = { 1: [], 2: [], 3: [] };
  let veien = [];
  data.forEach(row => {
    if (!row.type || !row.act || !row.text) return;
    if (row.type.toLowerCase() !== type.toLowerCase()) return;
    if (row.act === 'I veien for Endringen') {
      if (includeVeien) veien.push(row.text);
    } else if (['1', '2', '3'].includes(row.act)) {
      acts[row.act].push(row.text);
    }
  });
  return { acts, veien };
} 