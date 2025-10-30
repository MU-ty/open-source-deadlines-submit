/**
 * GitHub Bot Service
 * 负责自动创建Pull Request并提交活动数据
 */

import { Octokit } from '@octokit/rest';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

export class GitHubBotService {
  constructor() {
    const token = process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER || '';
    this.repo = process.env.GITHUB_REPO || '';
    this.defaultBranch = process.env.GITHUB_DEFAULT_BRANCH || 'main';

    if (token) {
      const octokitConfig = {
        auth: token,
        request: {
          timeout: 60000, // 60秒超时
        },
      };

      // 配置代理
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      if (proxyUrl) {
        console.log(`GitHub Bot: Using proxy ${proxyUrl}`);
        console.log(`Timeout set to: 60000ms`);
        
        const dispatcher = new ProxyAgent({
          uri: proxyUrl,
          requestTls: {
            rejectUnauthorized: false,
          },
        });
        setGlobalDispatcher(dispatcher);
      }

      this.octokit = new Octokit(octokitConfig);
    }
  }

  async createPR(activityYaml, category, metadata) {
    if (!this.octokit) {
      return {
        success: false,
        error: 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.',
      };
    }

    if (!this.owner || !this.repo) {
      return {
        success: false,
        error: 'GitHub repository not configured. Please set GITHUB_OWNER and GITHUB_REPO.',
      };
    }

    try {
      console.log(`Fetching ref for: ${this.owner}/${this.repo} branch: ${this.defaultBranch}`);
      const { data: refData } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${this.defaultBranch}`,
      });
      const latestCommitSha = refData.object.sha;
      console.log(`Latest commit SHA: ${latestCommitSha}`);

      const branchName = `add-activity-${Date.now()}`;
      console.log(`Creating new branch: ${branchName}`);
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: latestCommitSha,
      });

      const fileMap = {
        conference: 'data/conferences.yml',
        competition: 'data/competitions.yml',
        activity: 'data/activities.yml',
      };
      const filePath = fileMap[category];
      
      if (!filePath) {
        return {
          success: false,
          error: `Invalid category: ${category}`,
        };
      }

      let currentContent = '';
      let currentSha = '';
      
      try {
        const { data: fileData } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: filePath,
          ref: branchName,
        });
        
        if ('content' in fileData) {
          currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
          currentSha = fileData.sha;
        }
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      const newContent = currentContent
        ? `${currentContent}\n\n${activityYaml}`
        : activityYaml;

      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: `Add activity: ${metadata.activityTitle}`,
        content: Buffer.from(newContent).toString('base64'),
        branch: branchName,
        sha: currentSha || undefined,
      });

      const prBody = this.generatePRBody(metadata);
      
      const { data: prData } = await this.octokit.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title: `🤖 Add Activity: ${metadata.activityTitle}`,
        body: prBody,
        head: branchName,
        base: this.defaultBranch,
      });

      await this.octokit.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: prData.number,
        labels: ['auto-generated', 'needs-review'],
      });

      return {
        success: true,
        prUrl: prData.html_url,
        prNumber: prData.number,
      };
    } catch (error) {
      console.error('GitHub Bot Error:', error);
      
      let errorMessage = 'Failed to create PR';
      
      if (error.status === 404) {
        errorMessage = `Repository not found: ${this.owner}/${this.repo}. Please check GITHUB_OWNER and GITHUB_REPO settings.`;
      } else if (error.status === 401) {
        errorMessage = 'GitHub authentication failed. Please check your GITHUB_TOKEN.';
      } else if (error.status === 403) {
        errorMessage = 'GitHub access forbidden. Your token may not have the required "repo" permissions.';
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  generatePRBody(metadata) {
    const lines = [
      '## 🤖 AI Generated Pull Request',
      '',
      '此Pull Request由AI Agent自动生成，用于添加新的开源活动信息。',
      '',
      '### 活动信息',
      `- **活动名称**: ${metadata.activityTitle}`,
    ];

    if (metadata.submittedBy) {
      lines.push(`- **提交者**: ${metadata.submittedBy}`);
    }

    if (metadata.sourceUrl) {
      lines.push(`- **来源URL**: ${metadata.sourceUrl}`);
    }

    lines.push(
      '',
      '### ✅ 检查清单',
      '',
      '请Maintainer审核以下内容：',
      '',
      '- [ ] 活动信息准确无误',
      '- [ ] ID全局唯一',
      '- [ ] 时间线信息正确',
      '- [ ] 标签使用恰当（优先使用现有标签）',
      '- [ ] 分类正确（conference/competition/activity）',
      '- [ ] 链接有效',
      '',
      '---',
      '',
      '*由AI Agent自动生成*'
    );

    return lines.join('\n');
  }
}
