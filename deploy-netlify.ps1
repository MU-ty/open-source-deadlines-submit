# Activity Submission Bot - Netlify 快速部署脚本

Write-Host "🚀 开始部署到 Netlify..." -ForegroundColor Green
Write-Host ""

# 检查是否安装了 Netlify CLI
Write-Host "检查 Netlify CLI..." -ForegroundColor Yellow
$netlifyCmd = Get-Command netlify -ErrorAction SilentlyContinue

if (-not $netlifyCmd) {
    Write-Host "❌ 未找到 Netlify CLI" -ForegroundColor Red
    Write-Host "请先安装 Netlify CLI: npm install -g netlify-cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Netlify CLI 已安装" -ForegroundColor Green
Write-Host ""

# 检查环境变量
Write-Host "请确保已在 Netlify 中配置以下环境变量:" -ForegroundColor Yellow
Write-Host "  - AI_PROVIDER" -ForegroundColor Cyan
Write-Host "  - AI_MODEL" -ForegroundColor Cyan
Write-Host "  - DASHSCOPE_API_KEY" -ForegroundColor Cyan
Write-Host "  - GITHUB_TOKEN" -ForegroundColor Cyan
Write-Host "  - GITHUB_OWNER" -ForegroundColor Cyan
Write-Host "  - GITHUB_REPO" -ForegroundColor Cyan
Write-Host "  - DATA_DIR" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "是否已配置环境变量? (y/n)"
if ($confirm -ne "y") {
    Write-Host "请先配置环境变量，然后重新运行此脚本" -ForegroundColor Yellow
    Write-Host "可以使用以下命令配置:" -ForegroundColor Yellow
    Write-Host '  netlify env:set AI_PROVIDER "dashscope"' -ForegroundColor Cyan
    Write-Host '  netlify env:set AI_MODEL "qwen-plus"' -ForegroundColor Cyan
    Write-Host '  netlify env:set DASHSCOPE_API_KEY "your-key"' -ForegroundColor Cyan
    Write-Host "  ..." -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "开始部署..." -ForegroundColor Green

# 部署到生产环境
netlify deploy --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 部署成功!" -ForegroundColor Green
    Write-Host "访问 Netlify Dashboard 查看你的网站" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ 部署失败" -ForegroundColor Red
    Write-Host "请检查错误信息并重试" -ForegroundColor Yellow
}
