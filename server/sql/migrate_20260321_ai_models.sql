-- 迁移目的：
-- 1) 新增 ai_models 模型字典
-- 2) skill_usage_records 增加 model_id（并补索引、外键）
-- 3) 新增 user_recent_models（用于“最近使用模型”）
-- 4) 灌入“国内优先 + 国际常用”模型数据，并回填历史 model_id

SET @db_name = DATABASE();

-- 1) 模型字典
CREATE TABLE IF NOT EXISTS `ai_models` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider_code` VARCHAR(32) NOT NULL,
  `model_key` VARCHAR(64) NOT NULL,
  `model_name` VARCHAR(64) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_recommended` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_no` INT NOT NULL DEFAULT 100,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ai_models_provider_key` (`provider_code`, `model_key`),
  UNIQUE KEY `uk_ai_models_name` (`model_name`),
  KEY `idx_ai_models_active_sort` (`is_active`, `sort_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) skill_usage_records.model_id（按真实表名做增量）
SELECT COUNT(*) INTO @has_skill_usage_records
FROM information_schema.tables
WHERE table_schema = @db_name
  AND table_name = 'skill_usage_records';

SELECT COUNT(*) INTO @has_model_id_col
FROM information_schema.columns
WHERE table_schema = @db_name
  AND table_name = 'skill_usage_records'
  AND column_name = 'model_id';

SET @sql = IF(
  @has_skill_usage_records = 1 AND @has_model_id_col = 0,
  'ALTER TABLE skill_usage_records ADD COLUMN model_id BIGINT UNSIGNED NULL AFTER model_name',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_model_id_idx
FROM information_schema.statistics
WHERE table_schema = @db_name
  AND table_name = 'skill_usage_records'
  AND index_name = 'idx_skill_usage_model_id_time';

SET @sql = IF(
  @has_skill_usage_records = 1 AND @has_model_id_idx = 0,
  'ALTER TABLE skill_usage_records ADD KEY idx_skill_usage_model_id_time (model_id, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_model_fk
FROM information_schema.table_constraints
WHERE table_schema = @db_name
  AND table_name = 'skill_usage_records'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name = 'fk_skill_usage_model';

SET @sql = IF(
  @has_skill_usage_records = 1 AND @has_model_fk = 0,
  'ALTER TABLE skill_usage_records
     ADD CONSTRAINT fk_skill_usage_model
     FOREIGN KEY (model_id) REFERENCES ai_models (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 用户最近模型
CREATE TABLE IF NOT EXISTS `user_recent_models` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `model_id` BIGINT UNSIGNED NOT NULL,
  `last_used_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `use_count` INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_recent_model` (`user_id`, `model_id`),
  KEY `idx_user_recent_last_used` (`user_id`, `last_used_at`),
  CONSTRAINT `fk_user_recent_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_recent_model` FOREIGN KEY (`model_id`) REFERENCES `ai_models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) 模型字典数据（可重复执行）
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

-- 5) 历史数据回填 model_id
SET @sql = IF(
  @has_skill_usage_records = 1,
  'UPDATE skill_usage_records sur
     INNER JOIN ai_models am ON am.model_name = sur.model_name
     SET sur.model_id = am.id
   WHERE sur.model_id IS NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
