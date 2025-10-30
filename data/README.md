# 数据文件目录

此目录存放活动数据的YAML文件：

- `conferences.yml` - 会议类活动
- `competitions.yml` - 竞赛类活动
- `activities.yml` - 其他活动

## 文件格式

每个YAML文件应包含活动数组，格式如下：

```yaml
- title: 活动名称
  description: 活动描述
  category: conference  # 或 competition, activity
  tags:
    - 标签1
    - 标签2
  events:
    - year: 2025
      id: unique-activity-id-2025
      link: https://example.com
      timeline:
        - deadline: '2025-01-01T18:00:00'
          comment: 报名截止
      timezone: Asia/Shanghai
      date: 2025 年 1 月 1 日
      place: 线上
```

如果您的数据文件在其他位置，请在 `.env` 中配置 `DATA_DIR` 变量。
