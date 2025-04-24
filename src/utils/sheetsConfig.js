// Google Sheets configuration
export const SHEET_ID = '1CS9CjOEJlG0etC8JI117DTY-FRU9Pstm20De_iuxtK4'; // User's sheet ID
export const SHEET_NAME = 'Cards';

// Required columns in the sheet
const REQUIRED_COLUMNS = ['id', 'title', 'text'];

// Function to validate card data
function validateCard(card, rowIndex) {
  const errors = [];
  
  REQUIRED_COLUMNS.forEach(column => {
    if (!card[column]) {
      errors.push(`Missing ${column} in row ${rowIndex + 2}`);
    }
  });

  if (card.id && !/^\d+$/.test(card.id)) {
    errors.push(`Invalid id format in row ${rowIndex + 2}. Must be a number.`);
  }

  return errors;
}

// Function to fetch cards from Google Sheets
export async function fetchCardsFromSheet() {
  try {
    // Using the public CSV export URL
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
    console.log('🔄 Fetching cards from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const text = await response.text();
    console.log('📝 Raw sheet data:', text.slice(0, 200) + '...');
    
    // Parse CSV data
    const rows = text.split('\n').map(row => 
      row.split(',').map(cell => 
        cell.replace(/^"|"$/g, '').trim() // Remove quotes and trim whitespace
      )
    );
    
    if (rows.length < 2) {
      throw new Error('Sheet is empty or has no data rows');
    }

    // Validate headers
    const headers = rows[0].map(h => h.toLowerCase());
    console.log('👀 Found headers:', headers);
    
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
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
      const cardErrors = validateCard(card, index);
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
    throw error; // Let the component handle the error
  }
} 