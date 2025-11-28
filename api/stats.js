import { DataService } from '../src/data-service.js';

const dataService = new DataService(process.env.DATA_DIR || './data');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const existingData = await dataService.loadExistingData();
    res.status(200).json({
      success: true,
      stats: {
        totalTags: existingData.tags.length,
        totalIds: existingData.ids.length,
        tags: existingData.tags.slice(0, 50),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
