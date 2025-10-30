# Netlify 部署指南

## 📦 部署方式

### 方式一：通过 Netlify CLI 部署（推荐）

#### 1. 安装 Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2. 登录 Netlify

```bash
netlify login
```

#### 3. 初始化项目

在项目目录下运行：

```bash
netlify init
```

按照提示操作：
- 选择 "Create & configure a new site"
- 选择你的团队
- 输入站点名称（可选）
- 构建命令：`npm install`
- 发布目录：`public`
- Netlify functions 目录：`netlify/functions`

#### 4. 配置环境变量

在 Netlify 网站上配置环境变量，或使用 CLI：

```bash
netlify env:set AI_PROVIDER "dashscope"
netlify env:set AI_MODEL "qwen-plus"
netlify env:set DASHSCOPE_API_KEY "your-api-key"
netlify env:set GITHUB_TOKEN "your-github-token"
netlify env:set GITHUB_OWNER "MU-ty"
netlify env:set GITHUB_REPO "open-source-deadlines"
netlify env:set DATA_DIR "./data"
```

或者在 Netlify Dashboard 中：
1. 进入你的站点设置
2. 选择 "Environment variables"
3. 添加以下变量：
   - `AI_PROVIDER`: dashscope
   - `AI_MODEL`: qwen-plus
   - `DASHSCOPE_API_KEY`: 你的通义千问 API Key
   - `GITHUB_TOKEN`: 你的 GitHub Personal Access Token
   - `GITHUB_OWNER`: MU-ty
   - `GITHUB_REPO`: open-source-deadlines
   - `DATA_DIR`: ./data
   - `HTTP_PROXY`: http://127.0.0.1:7890 (如果需要代理)
   - `HTTPS_PROXY`: http://127.0.0.1:7890 (如果需要代理)

#### 5. 部署

```bash
netlify deploy --prod
```

---

### 方式二：通过 GitHub 自动部署

#### 1. 将项目推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/activity-submission-bot.git
git push -u origin main
```

#### 2. 在 Netlify 网站上部署

1. 访问 [https://app.netlify.com](https://app.netlify.com)
2. 点击 "Add new site" > "Import an existing project"
3. 选择 GitHub 并授权
4. 选择你的仓库
5. 配置构建设置：
   - **Build command**: `npm install`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
6. 添加环境变量（见上文）
7. 点击 "Deploy site"

---

## 🔧 配置说明

### netlify.toml

项目已包含 `netlify.toml` 配置文件：

```toml
[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "public"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Serverless Functions

已创建以下 Netlify Functions：
- `netlify/functions/submit.js` - 处理活动提交
- `netlify/functions/stats.js` - 获取统计信息
- `netlify/functions/health.js` - 健康检查

---

## 🌐 访问部署的网站

部署成功后，Netlify 会提供一个 URL，例如：
```
https://your-site-name.netlify.app
```

你可以在 Netlify Dashboard 中：
- 自定义域名
- 查看部署日志
- 管理环境变量
- 查看函数日志

---

## 📝 注意事项

### 1. 环境变量必须配置

确保在 Netlify 中配置了所有必需的环境变量：
- AI API Key
- GitHub Token
- 仓库信息

### 2. GitHub Token 权限

GitHub Token 需要以下权限：
- `repo` (完整仓库访问权限)
- `workflow` (如果需要触发工作流)

### 3. data 目录

如果 `data` 目录中有大量文件，建议：
- 将必要的数据文件提交到仓库
- 或使用外部存储服务（如 GitHub API 实时读取）

### 4. 代理配置

Netlify 服务器位于国外，通常不需要配置代理。
如果访问 GitHub API 有问题，可能需要：
- 检查 GitHub Token 是否有效
- 检查 API 限制

### 5. 函数超时

Netlify Functions 默认超时时间为 10 秒（免费版）。
如果处理时间较长，可能需要：
- 升级到付费计划（26 秒超时）
- 优化代码性能

---

## 🔍 调试

### 查看函数日志

1. 在 Netlify Dashboard 中
2. 选择你的站点
3. 进入 "Functions" 标签
4. 点击具体的函数查看日志

### 本地测试 Netlify Functions

```bash
# 安装依赖
npm install

# 使用 Netlify CLI 本地运行
netlify dev
```

这会在本地启动开发服务器，模拟 Netlify 环境。

---

## 🚀 持续部署

一旦配置完成，每次推送到 GitHub 主分支时，Netlify 会自动：
1. 拉取最新代码
2. 安装依赖
3. 构建项目
4. 部署到生产环境

---

## 📞 获取帮助

- [Netlify 文档](https://docs.netlify.com/)
- [Netlify Functions 文档](https://docs.netlify.com/functions/overview/)
- [Netlify CLI 文档](https://cli.netlify.com/)
