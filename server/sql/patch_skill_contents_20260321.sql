-- patch_skill_contents_20260321.sql
-- 为没有任何 skill_contents 的 skills 补充初始内容行
-- 使用方式（phpMyAdmin）：SQL 标签页整体粘贴 → 点击执行

SET NAMES utf8mb4;

-- 查找并补充缺失 skill_contents 的 skills
-- full_prompt / prompt 优先取 brief，退回到 title
INSERT INTO skill_contents (
  skill_id,
  version_no,
  is_current,
  prompt,
  system_prompt,
  user_template,
  full_prompt,
  full_prompt_html,
  variable_notes,
  variables_json,
  steps_json,
  use_scenes_json
)
SELECT
  s.id,
  1,
  1,
  COALESCE(s.brief, s.title),
  NULL,
  NULL,
  COALESCE(s.brief, s.title),
  CONCAT('<p>', REPLACE(COALESCE(s.brief, s.title), "'", '&#39;'), '</p>'),
  NULL,
  JSON_ARRAY(),
  JSON_ARRAY('复制内容', '粘贴到 AI 工具', '按需调整'),
  JSON_ARRAY()
FROM skills s
WHERE NOT EXISTS (
  SELECT 1 FROM skill_contents sc WHERE sc.skill_id = s.id
);

-- 结果确认（执行后应为 0，说明所有 skill 都有内容）
SELECT COUNT(1) AS skills_without_contents
FROM skills s
WHERE NOT EXISTS (
  SELECT 1 FROM skill_contents sc WHERE sc.skill_id = s.id
);
