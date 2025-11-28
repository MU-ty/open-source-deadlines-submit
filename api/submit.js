import { AIAgentService } from '../src/ai-agent.js';
import { GitHubBotService } from '../src/github-bot.js';
import { DataService } from '../src/data-service.js';

const aiAgent = new AIAgentService();
const githubBot = new GitHubBotService();
const dataService = new DataService(process.env.DATA_DIR || './data');

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, fileContent, fileName, createPR = true, submittedBy } = req.body;

    if (!url && !fileContent) {
      return res.status(400).json({
        success: false,
        error: 'Either url or fileContent is required',
      });
    }

    console.log('Loading existing data...');
    const existingData = await dataService.loadExistingData();
    
    console.log('Extracting activity information...');
    let result;
    
    if (url) {
      result = await aiAgent.extractFromURL(url, existingData.tags, existingData.ids);
    } else {
      result = await aiAgent.extractFromFile(fileContent, fileName || 'unknown', existingData.tags, existingData.ids);
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        warnings: result.warnings,
      });
    }

    console.log('Validating extracted data...');
    const validation = dataService.validateActivity(result.data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: ' + validation.errors.join('; '),
      });
    }

    result.data.tags = dataService.optimizeTags(result.data.tags);
    const activityYaml = aiAgent.toYAML(result.data);
    
    const response = {
      success: true,
      data: result.data,
      yaml: activityYaml,
      warnings: result.warnings,
    };

    if (createPR) {
      console.log('Creating Pull Request...');
      
      try {
        const prResult = await githubBot.createPR(
          activityYaml,
          result.data.category,
          {
            activityTitle: result.data.title,
            submittedBy: submittedBy,
            sourceUrl: url,
          }
        );

        if (prResult.success) {
          response.pr = {
            url: prResult.prUrl,
            number: prResult.prNumber,
          };
        } else {
          console.error('PR creation failed:', prResult.error);
          response.warnings = response.warnings || [];
          response.warnings.push(`PR creation failed: ${prResult.error}`);
        }
      } catch (error) {
        console.error('Unexpected PR error:', error);
        response.warnings = response.warnings || [];
        response.warnings.push(`Unexpected error during PR creation: ${error.message}`);
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      success: false,
      error: `Internal server error: ${error.message}`,
    });
  }
}
