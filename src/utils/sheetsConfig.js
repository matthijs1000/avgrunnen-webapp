// Google Sheets configuration
export const SHEET_ID = '1CS9CjOEJlG0etC8JI117DTY-FRU9Pstm20De_iuxtK4';
export const DRAMA_SHEET_NAME = 'Dramakort';
export const SCENE_SHEET_NAME = 'Scenekort';

// Required columns in the sheet
const DRAMA_REQUIRED_COLUMNS = ['id', 'title', 'text'];
const SCENE_REQUIRED_COLUMNS = ['id', 'title', 'text', 'playerId'];

// Function to parse CSV properly handling quoted fields
function parseCSVRow(row) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Handle escaped quotes
        field += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }
  
  // Add the last field
  fields.push(field.trim());
  return fields;
}

// Function to validate card data
function validateCard(card, rowIndex, isSceneCard = false) {
  const errors = [];
  const requiredColumns = isSceneCard ? SCENE_REQUIRED_COLUMNS : DRAMA_REQUIRED_COLUMNS;
  
  requiredColumns.forEach(column => {
    if (!card[column] && column !== 'playerId') { // playerId can be empty initially
      errors.push(`Missing ${column} in row ${rowIndex + 2}`);
    }
  });

  if (card.id && !/^\d+$/.test(card.id)) {
    errors.push(`Invalid id format in row ${rowIndex + 2}. Must be a number.`);
  }

  return errors;
}

// Function to fetch cards from a specific sheet
async function fetchCardsFromSheet(sheetName) {
  try {
    const isSceneCard = sheetName === SCENE_SHEET_NAME;
    // Using the public CSV export URL
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
    console.log('🔄 Fetching cards from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const text = await response.text();
    console.log('📝 Raw sheet data:', text.slice(0, 200) + '...');
    
    // Parse CSV data using proper quote handling
    const rows = text.split('\n').map(row => parseCSVRow(row));
    
    if (rows.length < 2) {
      throw new Error('Sheet is empty or has no data rows');
    }

    // Validate headers
    const headers = rows[0].map(h => h.toLowerCase());
    console.log('👀 Found headers:', headers);
    
    const requiredColumns = isSceneCard ? SCENE_REQUIRED_COLUMNS : DRAMA_REQUIRED_COLUMNS;
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0 && !isSceneCard) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Convert remaining rows to card objects
    const cards = [];
    const errors = [];

    rows.slice(1).forEach((row, index) => {
      const card = {};
      headers.forEach((header, colIndex) => {
        card[header] = row[colIndex] || '';
      });

      // Validate card data
      const cardErrors = validateCard(card, index, isSceneCard);
      if (cardErrors.length === 0) {
        cards.push(card);
      } else {
        errors.push(...cardErrors);
      }
    });

    // Log any errors but continue if we have valid cards
    if (errors.length > 0) {
      console.warn('⚠️ Warnings while loading cards:', errors);
    }

    if (cards.length === 0) {
      throw new Error('No valid cards found in sheet');
    }

    console.log(`📥 Successfully loaded ${cards.length} cards from sheet`);
    console.log('📋 First card as example:', cards[0]);
    
    return cards;

  } catch (error) {
    console.error('❌ Error fetching cards:', error);
    return []; // Return empty array instead of throwing
  }
}

// Function to fetch drama cards
export async function fetchDramaCards() {
  return fetchCardsFromSheet(DRAMA_SHEET_NAME);
}

// Function to fetch scene cards
export async function fetchSceneCards() {
  return fetchCardsFromSheet(SCENE_SHEET_NAME);
} 