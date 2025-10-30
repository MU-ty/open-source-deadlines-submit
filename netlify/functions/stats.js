import { DataService } from '../../src/data-service.js';

const dataService = new DataService(process.env.DATA_DIR || './data');

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const existingData = await dataService.loadExistingData();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stats: {
          totalTags: existingData.tags.length,
          totalIds: existingData.ids.length,
          tags: existingData.tags.slice(0, 50),
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}
