/**
 * 测试API功能
 */

import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testSubmit() {
  console.log('=== 测试活动提交API ===\n');

  const testData = {
    url: 'https://summer-ospp.ac.cn',
    createPR: false,  // 测试时不创建PR
    submittedBy: 'Test User',
  };

  console.log('发送请求...');
  console.log('URL:', testData.url);
  console.log('Create PR:', testData.createPR);
  console.log('');

  try {
    const response = await fetch(`${API_URL}/api/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('响应状态:', response.status);
    console.log('响应结果:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ 测试成功！');
      console.log('\n提取的活动信息:');
      console.log(`标题: ${result.data.title}`);
      console.log(`描述: ${result.data.description}`);
      console.log(`分类: ${result.data.category}`);
      console.log(`标签: ${result.data.tags.join(', ')}`);
      console.log(`\nYAML输出:`);
      console.log(result.yaml);
    } else {
      console.log('\n❌ 测试失败');
      console.log('错误:', result.error);
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message);
    console.log('\n提示: 请确保服务器正在运行 (npm start)');
  }
}

async function testStats() {
  console.log('\n\n=== 测试统计API ===\n');

  try {
    const response = await fetch(`${API_URL}/api/stats`);
    const result = await response.json();

    console.log('响应状态:', response.status);
    console.log('统计信息:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ 统计获取成功！');
      console.log(`总标签数: ${result.stats.totalTags}`);
      console.log(`总ID数: ${result.stats.totalIds}`);
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message);
  }
}

// 运行测试
(async () => {
  await testSubmit();
  await testStats();
})();
