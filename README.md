# Activity Submission Bot

🤖 基于AI的开源活动自动提交机器人

## 功能特性

- ✨ **AI驱动提取**: 使用大语言模型（支持OpenAI和阿里云DashScope）从URL或文本中自动提取活动信息
- 🔄 **自动创建PR**: 自动创建GitHub Pull Request提交活动数据
- ✅ **数据验证**: 自动验证数据完整性、ID唯一性、标签去重
- 🌐 **代理支持**: 支持HTTP/HTTPS代理配置
- 🎯 **标签优化**: 自动优化和去重标签，优先使用已存在的标签
- 📝 **YAML格式**: 自动生成标准YAML格式的活动数据

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下必需项：

```env
# AI配置（二选一）
AI_PROVIDER=dashscope  # 或 openai
DASHSCOPE_API_KEY=sk-xxx  # 阿里云百炼API Key
# 或
OPENAI_API_KEY=sk-xxx  # OpenAI API Key

# GitHub配置
GITHUB_TOKEN=ghp_xxx  # GitHub Personal Access Token
GITHUB_OWNER=your_username  # GitHub用户名或组织名
GITHUB_REPO=your_repo  # 仓库名
```

### 3. 启动服务

```bash
npm start
```

服务将在 `http://localhost:3000` 启动。

## API 使用

### 提交活动

**POST** `/api/submit`

#### 请求参数

```json
{
  "url": "https://example.com/activity",  // 活动URL（url和fileContent二选一）
  "fileContent": "活动文本内容",  // 或直接提供文本内容
  "fileName": "activity.txt",  // 如果提供fileContent，建议提供文件名
  "createPR": true,  // 是否创建PR，默认true
  "submittedBy": "提交者名称"  // 可选，提交者信息
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "title": "开源之夏 2025",
    "description": "面向全球开发者的暑期开源活动",
    "category": "competition",
    "tags": ["开源之夏", "学生项目"],
    "events": [...]
  },
  "yaml": "- title: 开源之夏 2025\n  ...",
  "pr": {
    "url": "https://github.com/owner/repo/pull/123",
    "number": 123
  }
}
```

### 获取统计信息

**GET** `/api/stats`

返回现有数据的统计信息，包括已有的标签和ID列表。

## 测试

### 测试AI提取功能

```bash
npm test
```

### 测试GitHub连接

```bash
npm run test:github
```

## 配置说明

### AI模型配置

支持两种AI提供商：

1. **阿里云DashScope**（推荐，性价比高）
   ```env
   AI_PROVIDER=dashscope
   AI_MODEL=qwen-plus  # 或 qwen-turbo, qwen-max
   DASHSCOPE_API_KEY=sk-xxx
   ```

2. **OpenAI**
   ```env
   AI_PROVIDER=openai
   AI_MODEL=gpt-4o-mini  # 或 gpt-4o, gpt-4-turbo
   OPENAI_API_KEY=sk-xxx
   ```

### 代理配置

如果访问GitHub需要代理：

```env
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
```

### 数据目录

指定YAML数据文件所在目录：

```env
DATA_DIR=./data
```

目录结构应为：
```
data/
  ├── conferences.yml
  ├── competitions.yml
  └── activities.yml
```

## 开发

### 项目结构

```
activity-submission-bot/
├── src/
│   ├── index.js           # 主服务入口
│   ├── ai-agent.js        # AI提取服务
│   ├── github-bot.js      # GitHub PR创建服务
│   └── data-service.js    # 数据验证和处理
├── tests/
│   ├── test-api.js        # API测试
│   └── test-github.js     # GitHub连接测试
├── data/                  # YAML数据文件目录
├── .env                   # 环境变量配置
├── .env.example           # 环境变量模板
└── package.json
```

### 开发模式

使用 watch 模式自动重启：

```bash
npm run dev
```

## 部署

### 部署到 Netlify

本项目支持一键部署到 Netlify。详细步骤请查看 [Netlify 部署指南](./NETLIFY_DEPLOY.md)。

#### 快速部署步骤

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登录 Netlify**
   ```bash
   netlify login
   ```

3. **初始化并部署**
   ```bash
   netlify init
   netlify deploy --prod
   ```

4. **配置环境变量**
   
   在 Netlify Dashboard 中添加以下环境变量：
   - `AI_PROVIDER`
   - `AI_MODEL`
   - `DASHSCOPE_API_KEY` 或 `OPENAI_API_KEY`
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `DATA_DIR`

或使用快速部署脚本（Windows）：
```powershell
.\deploy-netlify.ps1
```

部署后，你的应用将可以通过 `https://your-site-name.netlify.app` 访问。

### 部署到其他平台

- **Vercel**: 支持类似的 Serverless Functions
- **Railway**: 支持 Node.js 应用部署
- **Heroku**: 传统 PaaS 平台

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
