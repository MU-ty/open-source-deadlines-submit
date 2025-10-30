/**
 * 测试GitHub API连接和代理配置
 */

import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

async function testGitHubConnection() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  console.log('=== GitHub API连接测试 ===\n');
  console.log('配置信息:');
  console.log(`- Owner: ${owner}`);
  console.log(`- Repo: ${repo}`);
  console.log(`- Token: ${token ? '已配置 (' + token.substring(0, 8) + '...)' : '未配置'}`);
  console.log(`- Proxy: ${proxyUrl || '未配置'}`);
  console.log('\n开始测试...\n');

  if (!token) {
    console.error('❌ 错误: GITHUB_TOKEN 未配置');
    return;
  }

  const octokitConfig = {
    auth: token,
    request: {
      timeout: 60000,
    },
  };

  // 配置代理
  if (proxyUrl) {
    console.log(`✓ 使用代理: ${proxyUrl}`);
    const dispatcher = new ProxyAgent({
      uri: proxyUrl,
      requestTls: {
        rejectUnauthorized: false,
      },
    });
    setGlobalDispatcher(dispatcher);
  }

  const octokit = new Octokit(octokitConfig);

  try {
    // 测试 1: 获取用户信息
    console.log('测试 1: 获取GitHub用户信息...');
    const startTime1 = Date.now();
    const { data: user } = await octokit.users.getAuthenticated();
    const elapsed1 = Date.now() - startTime1;
    console.log(`✓ 成功! 用户: ${user.login} (${elapsed1}ms)\n`);

    // 测试 2: 获取仓库信息
    if (owner && repo) {
      console.log(`测试 2: 获取仓库信息 ${owner}/${repo}...`);
      const startTime2 = Date.now();
      const { data: repoData } = await octokit.repos.get({
        owner,
        repo,
      });
      const elapsed2 = Date.now() - startTime2;
      console.log(`✓ 成功! 仓库: ${repoData.full_name} (${elapsed2}ms)`);
      console.log(`  - 默认分支: ${repoData.default_branch}`);
      console.log(`  - 私有仓库: ${repoData.private ? '是' : '否'}\n`);

      // 测试 3: 获取分支引用
      console.log(`测试 3: 获取分支引用 ${repoData.default_branch}...`);
      const startTime3 = Date.now();
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${repoData.default_branch}`,
      });
      const elapsed3 = Date.now() - startTime3;
      console.log(`✓ 成功! SHA: ${refData.object.sha.substring(0, 8)} (${elapsed3}ms)\n`);
    }

    console.log('=== 所有测试通过! ===');
    console.log('GitHub API连接正常，可以创建PR了。');
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(`错误类型: ${error.constructor.name}`);
    console.error(`错误信息: ${error.message}`);
    
    if (error.status) {
      console.error(`HTTP状态码: ${error.status}`);
    }
    
    if (error.cause) {
      console.error(`原因: ${error.cause.message || error.cause}`);
    }

    console.log('\n可能的解决方案:');
    
    if (error.message.includes('Connect Timeout') || error.message.includes('ECONNREFUSED')) {
      console.log('1. 检查代理服务器是否正在运行');
      console.log('2. 验证代理地址是否正确: ' + proxyUrl);
      console.log('3. 尝试在浏览器中访问 https://github.com 确认网络连接');
      console.log('4. 如果使用的是Clash等代理工具，确保"允许来自局域网的连接"已开启');
    } else if (error.status === 401) {
      console.log('1. 检查 GITHUB_TOKEN 是否正确');
      console.log('2. 确保token有 repo 权限');
      console.log('3. 生成新token: https://github.com/settings/tokens');
    } else if (error.status === 404) {
      console.log('1. 检查 GITHUB_OWNER 和 GITHUB_REPO 是否正确');
      console.log('2. 确保token有访问该仓库的权限');
    }
  }
}

testGitHubConnection();
