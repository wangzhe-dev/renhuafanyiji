-- 开发环境初始化账号（密码: 12345678）
INSERT INTO users (
  mobile,
  email,
  password_hash,
  nickname,
  avatar_url,
  bio,
  display_color,
  status
) VALUES
  ('13800000000', 'dev@shaobuqi.com',  '$2b$10$Y31vtJpHUPbrpqiOtzerYuHR3eTW23VpEFLDp3L5qQuTGilrJO4be', '开发者',   NULL, '烧不起开发测试账号', '#5B5BD6', 1),
  ('13900000001', 'u2@shaobuqi.com',   '$2b$10$Y31vtJpHUPbrpqiOtzerYuHR3eTW23VpEFLDp3L5qQuTGilrJO4be', '张代码',   NULL, NULL, '#7C3AED', 1),
  ('13900000002', 'u3@shaobuqi.com',   '$2b$10$Y31vtJpHUPbrpqiOtzerYuHR3eTW23VpEFLDp3L5qQuTGilrJO4be', '王建明',   NULL, NULL, '#D6943A', 1),
  ('13900000003', 'u4@shaobuqi.com',   '$2b$10$Y31vtJpHUPbrpqiOtzerYuHR3eTW23VpEFLDp3L5qQuTGilrJO4be', '陈省钱',   NULL, NULL, '#2F8A57', 1),
  ('13900000004', 'u5@shaobuqi.com',   '$2b$10$Y31vtJpHUPbrpqiOtzerYuHR3eTW23VpEFLDp3L5qQuTGilrJO4be', '林产品',   NULL, NULL, '#0891B2', 1)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  nickname      = VALUES(nickname),
  display_color = VALUES(display_color),
  status        = VALUES(status),
  updated_at    = CURRENT_TIMESTAMP;

-- 模型字典（国内优先 + 国际常用）
INSERT INTO ai_models (provider_code, model_key, model_name, is_active, is_recommended, sort_no) VALUES
  ('deepseek', 'deepseek-chat', 'deepseek-chat', 1, 1, 10),
  ('deepseek', 'deepseek-reasoner', 'deepseek-reasoner', 1, 1, 20),
  ('qwen', 'qwen-plus', 'qwen-plus', 1, 1, 30),
  ('qwen', 'qwen-turbo', 'qwen-turbo', 1, 0, 40),
  ('qwen', 'qwen-max', 'qwen-max', 1, 1, 50),
  ('qwen', 'qwen-long', 'qwen-long', 1, 0, 60),
  ('zhipu', 'glm-4-plus', 'glm-4-plus', 1, 1, 70),
  ('zhipu', 'glm-4-air', 'glm-4-air', 1, 0, 80),
  ('zhipu', 'glm-4-flash', 'glm-4-flash', 1, 0, 90),
  ('zhipu', 'glm-4v-plus', 'glm-4v-plus', 1, 0, 100),
  ('moonshot', 'moonshot-v1-8k', 'moonshot-v1-8k', 1, 0, 110),
  ('moonshot', 'moonshot-v1-32k', 'moonshot-v1-32k', 1, 0, 120),
  ('moonshot', 'moonshot-v1-128k', 'moonshot-v1-128k', 1, 1, 130),
  ('doubao', 'doubao-pro-32k', 'doubao-pro-32k', 1, 1, 140),
  ('doubao', 'doubao-lite-32k', 'doubao-lite-32k', 1, 0, 150),
  ('baidu_qianfan', 'ernie-4.0-8k', 'ernie-4.0-8k', 1, 0, 160),
  ('baidu_qianfan', 'ernie-3.5-8k', 'ernie-3.5-8k', 1, 0, 170),
  ('tencent_hunyuan', 'hunyuan-standard', 'hunyuan-standard', 1, 0, 180),
  ('tencent_hunyuan', 'hunyuan-lite', 'hunyuan-lite', 1, 0, 190),
  ('minimax', 'abab6.5s-chat', 'abab6.5s-chat', 1, 0, 200),
  ('xfyun_spark', 'spark-max', 'spark-max', 1, 0, 210),
  ('xfyun_spark', 'spark-pro', 'spark-pro', 1, 0, 220),
  ('anthropic', 'claude-sonnet-4-5', 'claude-sonnet-4-5', 1, 1, 230),
  ('anthropic', 'claude-opus-4-5', 'claude-opus-4-5', 1, 0, 240),
  ('anthropic', 'claude-haiku-4-5', 'claude-haiku-4-5', 1, 0, 250),
  ('openai', 'gpt-4o', 'gpt-4o', 1, 1, 260),
  ('openai', 'gpt-4.1', 'gpt-4.1', 1, 1, 270),
  ('openai', 'o1', 'o1', 1, 0, 280),
  ('google', 'gemini-2.0-flash', 'gemini-2.0-flash', 1, 0, 290),
  ('google', 'gemini-2.0-pro', 'gemini-2.0-pro', 1, 0, 300)
ON DUPLICATE KEY UPDATE
  model_name = VALUES(model_name),
  is_active = VALUES(is_active),
  is_recommended = VALUES(is_recommended),
  sort_no = VALUES(sort_no),
  updated_at = CURRENT_TIMESTAMP;

-- 开发环境测试：消耗动态（feed-post 数据来源）
-- 用子查询按 email 取 user_id，避免 AUTO_INCREMENT 不连续导致外键失败
INSERT INTO skill_usage_records
  (user_id, skill_id, model_name, input_tokens, output_tokens, total_tokens, cost_amount, currency, reaction, note_text, images_json, created_at)
SELECT u.id, NULL, 'claude-sonnet-4-5', 18000, 10400, 28400, 18.6000, 'CNY', 'addicted',
  '用 Claude 帮我把一个 3000 行的老项目重构成 TypeScript，顺便补了单测，效果超出预期。Cursor + Claude 的组合真的很香，就是 token 烧得有点猛 😅',
  NULL, NOW() - INTERVAL 10 MINUTE FROM users u WHERE u.email = 'u2@shaobuqi.com';

INSERT INTO skill_usage_records
  (user_id, skill_id, model_name, input_tokens, output_tokens, total_tokens, cost_amount, currency, reaction, note_text, images_json, created_at)
SELECT u.id, NULL, 'gpt-4o', 600000, 290000, 890000, 56.2000, 'CNY', 'regret',
  '写了一篇技术文档，反复让它改格式改措辞，改了12轮。最后发现直接把要求写清楚第一轮就出来了。这课交得值。',
  NULL, NOW() - INTERVAL 1 HOUR FROM users u WHERE u.email = 'u3@shaobuqi.com';

INSERT INTO skill_usage_records
  (user_id, skill_id, model_name, input_tokens, output_tokens, total_tokens, cost_amount, currency, reaction, note_text, images_json, created_at)
SELECT u.id, NULL, 'claude-haiku-4-5', 5000, 3000, 8000, 0.4000, 'CNY', 'worth',
  '分享一个省钱心得：把翻译任务切到 Haiku，准确率几乎一样，token 只花 1/5。用 Sonnet 翻译真的是在交智商税。',
  NULL, NOW() - INTERVAL 2 HOUR FROM users u WHERE u.email = 'u4@shaobuqi.com';

INSERT INTO skill_usage_records
  (user_id, skill_id, model_name, input_tokens, output_tokens, total_tokens, cost_amount, currency, reaction, note_text, images_json, created_at)
SELECT u.id, NULL, 'claude-sonnet-4-5', 500000, 390000, 890000, 56.2000, 'CNY', 'ok',
  '今天测了一个 Agent 工作流：自动读取竞品信息 → 生成对比报告 → 转化为 PPT 大纲，跑了 3 次才稳定，前两次各种幻觉。但稳定之后真的可以一键跑，值得那些 token。',
  NULL, NOW() - INTERVAL 3 HOUR FROM users u WHERE u.email = 'dev@shaobuqi.com';

INSERT INTO skill_usage_records
  (user_id, skill_id, model_name, input_tokens, output_tokens, total_tokens, cost_amount, currency, reaction, note_text, images_json, created_at)
SELECT u.id, NULL, 'claude-opus-4-5', 120000, 78000, 198000, 12.3000, 'CNY', 'worth',
  '用 Claude Opus 写了份完整的 PRD，结构清晰逻辑自洽，但是 token 花了快 200k。这钱花得有点心疼但是确实省了我一个下午。',
  NULL, NOW() - INTERVAL 1 DAY FROM users u WHERE u.email = 'u5@shaobuqi.com';

INSERT INTO skill_usage_records
  (user_id, skill_id, model_name, input_tokens, output_tokens, total_tokens, cost_amount, currency, reaction, note_text, images_json, created_at)
SELECT u.id, NULL, 'gpt-4.1', 90000, 52000, 142000, 8.8000, 'CNY', 'addicted',
  '用 GPT 分析了一份 5000 行的用户行为数据，输出了竞品分析和增长建议，然后让它帮我做成了 Notion 页面，前后不到 20 分钟。',
  NULL, NOW() - INTERVAL 30 HOUR FROM users u WHERE u.email = 'u3@shaobuqi.com';

INSERT INTO skill_usage_records
  (user_id, skill_id, model_name, input_tokens, output_tokens, total_tokens, cost_amount, currency, reaction, note_text, images_json, created_at)
SELECT u.id, NULL, 'claude-sonnet-4-5', 28000, 20000, 48000, 3.2000, 'CNY', 'worth',
  '把 Figma 截图丢进去直接生成了可跑的 Vue 组件，只改了 10 行。这才是 AI 应该做的事情，不是帮我解释代码。',
  NULL, NOW() - INTERVAL 48 HOUR FROM users u WHERE u.email = 'u2@shaobuqi.com';

INSERT INTO skill_usage_records
  (user_id, skill_id, model_name, input_tokens, output_tokens, total_tokens, cost_amount, currency, reaction, note_text, images_json, created_at)
SELECT u.id, NULL, 'claude-haiku-4-5', 3000, 2000, 5000, 0.2000, 'CNY', 'ok',
  '今天试了下用 Haiku 做批量 SEO 标题生成，100 条标题不到 1 块钱，速度也很快。小任务真的没必要上大模型。',
  NULL, NOW() - INTERVAL 3 DAY FROM users u WHERE u.email = 'u4@shaobuqi.com';

-- 回填 model_id（老数据兼容）
UPDATE skill_usage_records sur
INNER JOIN ai_models am ON am.model_name = sur.model_name
SET sur.model_id = am.id
WHERE sur.model_id IS NULL;
