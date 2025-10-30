/**
 * 数据验证和处理服务
 */

import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

export class DataService {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
  }

  async loadExistingData() {
    const categories = ['conferences', 'competitions', 'activities'];
    const allData = {
      tags: new Set(),
      ids: new Set(),
    };

    for (const category of categories) {
      const filePath = path.join(this.dataDir, `${category}.yml`);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = YAML.parse(content);
        
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
              item.tags.forEach(tag => allData.tags.add(tag));
            }
            if (item.events && Array.isArray(item.events)) {
              item.events.forEach(event => {
                if (event.id) allData.ids.add(event.id);
              });
            }
          });
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`Warning: Could not load ${filePath}:`, error.message);
        }
      }
    }

    return {
      tags: Array.from(allData.tags),
      ids: Array.from(allData.ids),
    };
  }

  optimizeTags(tags) {
    // 去重和标准化
    const uniqueTags = [...new Set(tags.map(tag => tag.trim()))];
    return uniqueTags.filter(tag => tag.length > 0);
  }

  validateActivity(activity) {
    const errors = [];
    
    if (!activity.title) errors.push('Missing title');
    if (!activity.description) errors.push('Missing description');
    if (!['conference', 'competition', 'activity'].includes(activity.category)) {
      errors.push('Invalid category');
    }
    if (!Array.isArray(activity.tags) || activity.tags.length === 0) {
      errors.push('Tags must be a non-empty array');
    }
    if (!Array.isArray(activity.events) || activity.events.length === 0) {
      errors.push('Events must be a non-empty array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
