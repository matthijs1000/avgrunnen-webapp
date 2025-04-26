import Papa from 'papaparse';

// Google Sheets configuration
export const SHEET_ID = '1CS9CjOEJlG0etC8JI117DTY-FRU9Pstm20De_iuxtK4';
export const DRAMA_SHEET_GID = '0';
export const SCENE_SHEET_GID = '1815867176';



// Required columns in the sheet
const DRAMA_REQUIRED_COLUMNS = ['id', 'title', 'text'];
const SCENE_REQUIRED_COLUMNS = ['id', 'title', 'text'];

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
    if (!card[column]) {
      errors.push(`Missing ${column} in row ${rowIndex + 2}`);
    }
  });

  if (card.id && !/^\d+$/.test(card.id)) {
    errors.push(`Invalid id format in row ${rowIndex + 2}. Must be a number.`);
  }

  return errors;
}

// Function to fetch cards from a specific sheet
async function fetchCardsFromSheet(isSceneCards = false) {
  console.log('🔄 Starting fetchCardsFromSheet...');
  try {
    const gid = isSceneCards ? SCENE_SHEET_GID : DRAMA_SHEET_GID;
    // Using the public CSV export URL with the correct format and gid
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    console.log('🔄 Fetching cards from:', url);
    console.log('📊 Card type:', isSceneCards ? 'Scene Cards' : 'Drama Cards');
    
    const response = await fetch(url);
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ Failed to fetch sheet:', response.status, response.statusText);
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const text = await response.text();
    console.log('📝 Raw sheet data (first 200 chars):', text.slice(0, 200));
    console.log('📝 Total data length:', text.length);
    console.log('📝 Contains BOM:', text.charCodeAt(0) === 0xFEFF ? 'Yes' : 'No');
    
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const cards = parsed.data;
    console.log('📊 Total rows found:', cards.length);
    if (cards.length === 0) {
      console.error('❌ Sheet is empty or has no data rows');
      throw new Error('Sheet is empty or has no data rows');
    }

    // Validate headers
    const headers = Object.keys(cards[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
    console.log('👀 Found headers (normalized):', headers);
    const requiredColumns = isSceneCards ? SCENE_REQUIRED_COLUMNS : DRAMA_REQUIRED_COLUMNS;
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      console.error('❌ Missing required columns:', missingColumns);
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Validate and collect valid cards
    const validCards = [];
    const errors = [];
    cards.forEach((card, index) => {
      const cardErrors = validateCard(card, index, isSceneCards);
      if (cardErrors.length === 0) {
        validCards.push(card);
        console.log(`✅ Valid card found:`, card);
      } else {
        errors.push(...cardErrors);
        console.warn(`⚠️ Invalid card in row ${index + 2}:`, cardErrors);
      }
    });

    if (errors.length > 0) {
      console.warn('⚠️ Warnings while loading cards:', errors);
    }

    if (validCards.length === 0) {
      console.error('❌ No valid cards found in sheet');
      throw new Error('No valid cards found in sheet');
    }

    console.log(`📥 Successfully loaded ${validCards.length} cards from sheet`);
    console.log('📋 First card as example:', validCards[0]);
    console.log('📋 Last card as example:', validCards[validCards.length - 1]);
    console.log('📋 All cards and their act values:');
    validCards.forEach((card, idx) => {
      console.log(`${idx}: id=${card.id}, title=${card.title}, act1=${card['act 1']}, act2=${card['act 2']}, act3=${card['act 3']}`);
    });
    
    return validCards;

  } catch (error) {
    console.error('❌ Error in fetchCardsFromSheet:', error);
    console.error('Stack trace:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    return []; // Return empty array instead of throwing
  }
}

// Function to fetch drama cards
export async function fetchDramaCards() {
  console.log('🎭 Starting fetchDramaCards...');
  try {
    const cards = await fetchCardsFromSheet(false);
    console.log(`🎭 fetchDramaCards completed with ${cards.length} cards`);
    return cards;
  } catch (error) {
    console.error('❌ Error in fetchDramaCards:', error);
    throw error;
  }
}

// Function to fetch scene cards
export async function fetchSceneCards() {
  console.log('🎬 Starting fetchSceneCards...');
  try {
    const cards = await fetchCardsFromSheet(true);
    console.log(`🎬 fetchSceneCards completed with ${cards.length} cards`);
    return cards;
  } catch (error) {
    console.error('❌ Error in fetchSceneCards:', error);
    throw error;
  }
}

// Test function to check sheet accessibility
export async function testSheetAccess() {
  const dramaSheetsUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${DRAMA_SHEET_GID}`;
  const sceneSheetsUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SCENE_SHEET_GID}`;
  
  console.log('🔍 Testing sheet access...');
  console.log('📄 Drama sheet URL:', dramaSheetsUrl);
  console.log('🎬 Scene sheet URL:', sceneSheetsUrl);
  
  try {
    console.log('🎭 Testing drama sheet...');
    const dramaResponse = await fetch(dramaSheetsUrl);
    console.log('Drama sheet status:', dramaResponse.status);
    console.log('Drama sheet headers:', Object.fromEntries(dramaResponse.headers.entries()));
    const dramaText = await dramaResponse.text();
    console.log('Drama sheet first 200 chars:', dramaText.slice(0, 200));
    
    console.log('🎬 Testing scene sheet...');
    const sceneResponse = await fetch(sceneSheetsUrl);
    console.log('Scene sheet status:', sceneResponse.status);
    console.log('Scene sheet headers:', Object.fromEntries(sceneResponse.headers.entries()));
    const sceneText = await sceneResponse.text();
    console.log('Scene sheet first 200 chars:', sceneText.slice(0, 200));
    
    return {
      dramaStatus: dramaResponse.status,
      sceneStatus: sceneResponse.status,
      dramaOk: dramaResponse.ok,
      sceneOk: sceneResponse.ok
    };
  } catch (error) {
    console.error('❌ Sheet access test failed:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    return {
      error: error.message
    };
  }
} 