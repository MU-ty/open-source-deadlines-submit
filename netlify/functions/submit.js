import { AIAgentService } from '../../src/ai-agent.js';
import { GitHubBotService } from '../../src/github-bot.js';
import { DataService } from '../../src/data-service.js';

const aiAgent = new AIAgentService();
const githubBot = new GitHubBotService();
const dataService = new DataService(process.env.DATA_DIR || './data');

export async function handler(event, context) {
  // 处理 CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { url, fileContent, fileName, createPR = true, submittedBy } = JSON.parse(event.body);

    if (!url && !fileContent) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Either url or fileContent is required',
        }),
      };
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: result.error,
          warnings: result.warnings,
        }),
      };
    }

    console.log('Validating extracted data...');
    const validation = dataService.validateActivity(result.data);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Validation failed: ' + validation.errors.join('; '),
        }),
      };
    }

    // 优化标签
    result.data.tags = dataService.optimizeTags(result.data.tags);

    const activityYaml = aiAgent.toYAML(result.data);
    
    const response = {
      success: true,
      data: result.data,
      yaml: activityYaml,
      warnings: result.warnings,
    };

    // 如果需要创建PR
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
          
          if (prResult.error.includes('Connect Timeout') || 
              prResult.error.includes('ECONNREFUSED') ||
              prResult.error.includes('fetch failed')) {
            response.networkError = true;
            response.networkMessage = '网络连接失败。可能需要配置代理或检查GitHub Token。数据已成功提取，您可以手动创建PR。';
          }
        }
      } catch (error) {
        console.error('Unexpected PR error:', error);
        response.warnings = response.warnings || [];
        response.warnings.push(`Unexpected error during PR creation: ${error.message}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Server error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Internal server error: ${error.message}`,
      }),
    };
  }
}
