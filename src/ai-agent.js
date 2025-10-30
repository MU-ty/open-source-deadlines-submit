/**
 * AI Agent 核心服务
 * 负责从URL或文件中提取活动信息
 */

import OpenAI from 'openai';

export class AIAgentService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai';
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
    
    if (this.provider === 'dashscope') {
      const apiKey = process.env.DASHSCOPE_API_KEY;
      const baseURL = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      
      if (apiKey) {
        this.openai = new OpenAI({ apiKey, baseURL });
      }
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        this.openai = new OpenAI({ apiKey });
      }
    }
  }

  async extractFromURL(url, existingTags = [], existingIds = []) {
    try {
      const webContent = await this.fetchWebContent(url);
      return await this.extractActivityInfo(webContent, url, existingTags, existingIds);
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract from URL: ${error.message}`,
      };
    }
  }

  async extractFromFile(fileContent, fileName, existingTags = [], existingIds = []) {
    try {
      const processedContent = await this.processFileContent(fileContent, fileName);
      return await this.extractActivityInfo(processedContent, '', existingTags, existingIds);
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract from file: ${error.message}`,
      };
    }
  }

  async fetchWebContent(url) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent;
  }

  async processFileContent(fileContent, fileName) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const isImage = imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    
    if (isImage) {
      return `[Image file: ${fileName}. OCR processing would be applied here in production.]`;
    }
    
    return fileContent;
  }

  async extractActivityInfo(content, sourceUrl, existingTags, existingIds) {
    if (!this.openai) {
      const provider = this.provider === 'dashscope' ? 'DashScope' : 'OpenAI';
      const envVar = this.provider === 'dashscope' ? 'DASHSCOPE_API_KEY' : 'OPENAI_API_KEY';
      return {
        success: false,
        error: `${provider} API key not configured. Please set ${envVar} environment variable.`,
      };
    }

    const systemPrompt = `你是一个专业的开源活动信息提取助手。你的任务是从给定的文本中提取开源会议、竞赛或活动的关键信息，并按照指定的JSON格式输出。

【重要】必须返回完整的JSON对象，包含所有必需字段！

必需字段（每个都必须有值）：
{
  "title": "活动名称（必填）",
  "description": "活动的一句话描述，不超过100字（必填）",
  "category": "必须是以下之一：conference、competition、activity（必填）",
  "tags": ["至少一个标签（必填，数组）"],
  "events": [{
    "year": 2025,
    "id": "唯一ID，如kaiyuanzhixia-2025（必填）",
    "link": "活动官网URL（必填）",
    "timeline": [{
      "deadline": "2025-06-01T18:00:00（必填，ISO 8601格式）",
      "comment": "截止说明，如报名截止（必填）"
    }],
    "timezone": "Asia/Shanghai（必填，IANA时区）",
    "date": "2025 年 6 月 1 日 - 9 月 30 日（必填，人类可读）",
    "place": "线上或线下地点（必填）"
  }]
}

【关键规则】：
1. title, description, category, tags, events 都是必填字段
2. category 只能是：conference（会议）、competition（竞赛）、activity（活动）
3. tags 必须是非空数组，至少包含1个标签
4. events 必须是非空数组，至少包含1个事件
5. 每个event必须包含：year, id, link, timeline, timezone, date, place
6. timeline必须是非空数组，至少包含1个时间点
7. 每个timeline项必须包含：deadline（ISO 8601格式）和comment
8. id格式建议：活动拼音-年份，如kaiyuanzhixia-2025
9. timezone使用IANA标准，如Asia/Shanghai
10. date使用中文格式，如"2025 年 6 月 1 日"或"2025 年 6 月 1 日 - 9 月 30 日"
11. 如果提取不到某个必需字段，使用合理的默认值或从上下文推断

【标签建议】（优先使用）：${existingTags.slice(0, 20).join('、') || '无'}
【已存在ID】（避免重复）：${existingIds.slice(0, 10).join('、')}${existingIds.length > 10 ? '等' : ''}

【示例输出】：
{
  "title": "开源之夏 2025",
  "description": "面向全球开发者的暑期开源活动，鼓励学生参与开源项目开发",
  "category": "competition",
  "tags": ["开源之夏", "学生项目", "暑期活动"],
  "events": [{
    "year": 2025,
    "id": "kaiyuanzhixia-2025",
    "link": "https://summer-ospp.ac.cn",
    "timeline": [
      {"deadline": "2025-06-04T18:00:00", "comment": "项目申请截止"},
      {"deadline": "2025-09-30T23:59:59", "comment": "项目结项"}
    ],
    "timezone": "Asia/Shanghai",
    "date": "2025 年 4 月 30 日 - 9 月 30 日",
    "place": "线上"
  }]
}`;

    const userPrompt = sourceUrl
      ? `请从以下网页内容中提取活动信息：\n\n来源URL: ${sourceUrl}\n\n内容：\n${content.slice(0, 8000)}`
      : `请从以下内容中提取活动信息：\n\n${content.slice(0, 8000)}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      console.log('=== AI原始返回内容 ===');
      console.log(responseContent);
      console.log('=== 返回内容结束 ===');

      const extractedData = JSON.parse(responseContent);
      
      console.log('=== 解析后的JSON对象 ===');
      console.log(JSON.stringify(extractedData, null, 2));
      console.log('=== JSON对象结束 ===');
      
      const validation = this.validateExtractedData(extractedData, existingIds);
      
      if (!validation.valid) {
        console.error('=== 数据验证失败 ===');
        console.error('错误列表:', validation.errors);
        console.error('=== 验证失败结束 ===');
        return {
          success: false,
          error: validation.errors?.join('; '),
          warnings: validation.warnings,
        };
      }

      return {
        success: true,
        data: extractedData,
        warnings: validation.warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: `AI extraction failed: ${error.message}`,
      };
    }
  }

  validateExtractedData(data, existingIds) {
    const errors = [];
    const warnings = [];

    if (!data.title || typeof data.title !== 'string') {
      errors.push('Missing or invalid title');
    }
    if (!data.description || typeof data.description !== 'string') {
      errors.push('Missing or invalid description');
    }
    if (!['conference', 'competition', 'activity'].includes(data.category)) {
      errors.push('Invalid category (must be conference, competition, or activity)');
    }
    if (!Array.isArray(data.tags) || data.tags.length === 0) {
      errors.push('Tags must be a non-empty array');
    }
    if (!Array.isArray(data.events) || data.events.length === 0) {
      errors.push('Events must be a non-empty array');
    }

    if (Array.isArray(data.events)) {
      data.events.forEach((event, index) => {
        if (!event.id || typeof event.id !== 'string') {
          errors.push(`Event ${index}: Missing or invalid id`);
        } else if (existingIds.includes(event.id)) {
          errors.push(`Event ${index}: Duplicate ID '${event.id}'`);
        }
        
        if (!event.year || typeof event.year !== 'number') {
          errors.push(`Event ${index}: Missing or invalid year`);
        }
        
        if (!event.link || typeof event.link !== 'string') {
          errors.push(`Event ${index}: Missing or invalid link`);
        }
        
        if (!Array.isArray(event.timeline) || event.timeline.length === 0) {
          errors.push(`Event ${index}: Timeline must be a non-empty array`);
        }
        
        if (!event.timezone || typeof event.timezone !== 'string') {
          errors.push(`Event ${index}: Missing or invalid timezone`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  toYAML(data) {
    const yamlLines = [];
    
    yamlLines.push(`- title: ${data.title}`);
    yamlLines.push(`  description: ${data.description}`);
    yamlLines.push(`  category: ${data.category}`);
    yamlLines.push('  tags:');
    data.tags.forEach(tag => {
      yamlLines.push(`    - ${tag}`);
    });
    yamlLines.push('  events:');
    
    data.events.forEach(event => {
      yamlLines.push(`    - year: ${event.year}`);
      yamlLines.push(`      id: ${event.id}`);
      yamlLines.push(`      link: ${event.link}`);
      yamlLines.push('      timeline:');
      event.timeline.forEach(timeline => {
        yamlLines.push(`        - deadline: '${timeline.deadline}'`);
        yamlLines.push(`          comment: '${timeline.comment}'`);
      });
      yamlLines.push(`      timezone: ${event.timezone}`);
      yamlLines.push(`      date: ${event.date}`);
      yamlLines.push(`      place: ${event.place}`);
    });
    
    return yamlLines.join('\n');
  }
}
