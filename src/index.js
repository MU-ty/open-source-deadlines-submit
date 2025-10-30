/**
 * Activity Submission Bot
 * AI驱动的活动提交机器人
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIAgentService } from './ai-agent.js';
import { GitHubBotService } from './github-bot.js';
import { DataService } from './data-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// 初始化服务
const aiAgent = new AIAgentService();
const githubBot = new GitHubBotService();
const dataService = new DataService(process.env.DATA_DIR || './data');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 提供静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// API 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    name: 'Activity Submission Bot',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      submit: 'POST /api/submit',
      stats: 'GET /api/stats',
    },
  });
});

// 提交活动接口
app.post('/api/submit', async (req, res) => {
  const { url, fileContent, fileName, createPR = true } = req.body;

  if (!url && !fileContent) {
    return res.status(400).json({
      success: false,
      error: 'Either url or fileContent is required',
    });
  }

  try {
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
            submittedBy: req.body.submittedBy,
            sourceUrl: url,
          }
        );

        if (prResult.success) {
          response.pr = {
            url: prResult.prUrl,
            number: prResult.prNumber,
          };
        } else {
          // PR创建失败但AI提取成功，仍然返回成功
          console.error('PR creation failed:', prResult.error);
          response.warnings = response.warnings || [];
          response.warnings.push(`PR creation failed: ${prResult.error}`);
          
          // 检查是否是网络连接问题
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

    res.json(response);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: `Internal server error: ${error.message}`,
    });
  }
});

// 获取现有数据统计
app.get('/api/stats', async (req, res) => {
  try {
    const existingData = await dataService.loadExistingData();
    res.json({
      success: true,
      stats: {
        totalTags: existingData.tags.length,
        totalIds: existingData.ids.length,
        tags: existingData.tags.slice(0, 50), // 返回前50个标签
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`\n🤖 Activity Submission Bot started!`);
  console.log(`📡 Server running on http://localhost:${port}`);
  console.log(`\n📋 Configuration:`);
  console.log(`   - AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
  console.log(`   - AI Model: ${process.env.AI_MODEL || 'gpt-4o-mini'}`);
  console.log(`   - GitHub Repo: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`);
  console.log(`   - Data Directory: ${process.env.DATA_DIR || './data'}`);
  console.log(`\n🚀 Ready to accept submissions!\n`);
});

export default app;
