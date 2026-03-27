CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mobile` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `nickname` VARCHAR(64) NOT NULL,
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `bio` VARCHAR(255) DEFAULT NULL,
  `display_color` CHAR(7) DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `published_skill_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_copy_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `avg_success_rate` DECIMAL(5,2) DEFAULT NULL,
  `follower_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `following_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_mobile` (`mobile`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(32) NOT NULL,
  `sort_no` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_name` (`name`),
  KEY `idx_categories_status_sort` (`status`, `sort_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tags` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(32) NOT NULL,
  `slug` VARCHAR(64) DEFAULT NULL,
  `use_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tags_name` (`name`),
  UNIQUE KEY `uk_tags_slug` (`slug`),
  KEY `idx_tags_status_use_count` (`status`, `use_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skills` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `creator_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `brief` VARCHAR(500) DEFAULT NULL,
  `category_id` BIGINT UNSIGNED DEFAULT NULL,
  `scene` VARCHAR(32) DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0=draft,1=published,2=archived',
  `publish_at` DATETIME DEFAULT NULL,
  `copy_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `favorite_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `feedback_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `success_rate` DECIMAL(5,2) DEFAULT NULL,
  `avg_input_tokens` INT UNSIGNED DEFAULT NULL,
  `avg_output_tokens` INT UNSIGNED DEFAULT NULL,
  `avg_total_tokens` INT UNSIGNED DEFAULT NULL,
  `estimated_cost_low` DECIMAL(12,4) DEFAULT NULL,
  `estimated_cost_high` DECIMAL(12,4) DEFAULT NULL,
  `recommended_model_name` VARCHAR(64) DEFAULT NULL,
  `common_model_name` VARCHAR(64) DEFAULT NULL,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否精选（管理员设置）',
  `total_uses` INT UNSIGNED NOT NULL DEFAULT 0,
  `week_uses` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_skills_creator` (`creator_id`),
  KEY `idx_skills_featured` (`is_featured`, `status`, `publish_at`),
  KEY `idx_skills_status_publish` (`status`, `publish_at`),
  KEY `idx_skills_scene` (`scene`),
  KEY `idx_skills_category` (`category_id`),
  KEY `idx_skills_copy_count` (`copy_count`),
  KEY `idx_skills_favorite_count` (`favorite_count`),
  CONSTRAINT `fk_skills_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_skills_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skill_contents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  `version_no` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_current` TINYINT NOT NULL DEFAULT 1,
  `prompt` LONGTEXT DEFAULT NULL,
  `system_prompt` LONGTEXT DEFAULT NULL,
  `user_template` LONGTEXT DEFAULT NULL,
  `full_prompt` LONGTEXT DEFAULT NULL,
  `full_prompt_html` LONGTEXT DEFAULT NULL,
  `variable_notes` TEXT DEFAULT NULL,
  `variables_json` JSON DEFAULT NULL,
  `steps_json` JSON DEFAULT NULL,
  `use_scenes_json` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_skill_contents_skill_version` (`skill_id`, `version_no`),
  KEY `idx_skill_contents_current` (`skill_id`, `is_current`),
  CONSTRAINT `fk_skill_contents_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skill_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `storage_provider` VARCHAR(32) DEFAULT 'minio',
  `bucket_name` VARCHAR(64) DEFAULT NULL,
  `object_key` VARCHAR(255) DEFAULT NULL,
  `mime_type` VARCHAR(64) DEFAULT NULL,
  `file_size` BIGINT UNSIGNED DEFAULT NULL,
  `image_type` ENUM('cover','content') NOT NULL DEFAULT 'content',
  `sort_no` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `width` INT UNSIGNED DEFAULT NULL,
  `height` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_skill_images_skill_sort` (`skill_id`, `sort_no`),
  CONSTRAINT `fk_skill_images_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skill_tag_rel` (
  `skill_id` BIGINT UNSIGNED NOT NULL,
  `tag_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`skill_id`, `tag_id`),
  KEY `idx_skill_tag_rel_tag` (`tag_id`, `skill_id`),
  CONSTRAINT `fk_skill_tag_rel_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_tag_rel_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skill_favorites` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_skill_favorites_user_skill` (`user_id`, `skill_id`),
  KEY `idx_skill_favorites_skill_time` (`skill_id`, `created_at`),
  CONSTRAINT `fk_skill_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_favorites_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skill_copies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  `source_channel` VARCHAR(32) DEFAULT NULL,
  `copied_text_hash` CHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_skill_copies_user_time` (`user_id`, `created_at`),
  KEY `idx_skill_copies_skill_time` (`skill_id`, `created_at`),
  CONSTRAINT `fk_skill_copies_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_copies_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS `skill_usage_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `skill_id` BIGINT UNSIGNED DEFAULT NULL,
  `copy_id` BIGINT UNSIGNED DEFAULT NULL,
  `model_name` VARCHAR(64) NOT NULL,
  `model_id` BIGINT UNSIGNED DEFAULT NULL,
  `input_tokens` INT UNSIGNED DEFAULT NULL,
  `output_tokens` INT UNSIGNED DEFAULT NULL,
  `total_tokens` INT UNSIGNED DEFAULT NULL,
  `cost_amount` DECIMAL(12,4) DEFAULT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'CNY',
  `reaction` ENUM('worth','ok','regret','addicted') DEFAULT NULL,
  `note_text` TEXT DEFAULT NULL,
  `images_json` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_skill_usage_user_time` (`user_id`, `created_at`),
  KEY `idx_skill_usage_skill_time` (`skill_id`, `created_at`),
  KEY `idx_skill_usage_model_time` (`model_name`, `created_at`),
  KEY `idx_skill_usage_model_id_time` (`model_id`, `created_at`),
  CONSTRAINT `fk_skill_usage_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_usage_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_skill_usage_copy` FOREIGN KEY (`copy_id`) REFERENCES `skill_copies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_skill_usage_model` FOREIGN KEY (`model_id`) REFERENCES `ai_models` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS `feed_post_likes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usage_record_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feed_post_likes_post_user` (`usage_record_id`, `user_id`),
  KEY `idx_feed_post_likes_user_time` (`user_id`, `created_at`),
  CONSTRAINT `fk_feed_post_likes_post` FOREIGN KEY (`usage_record_id`) REFERENCES `skill_usage_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feed_post_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feed_post_resonates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usage_record_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feed_post_resonates_post_user` (`usage_record_id`, `user_id`),
  KEY `idx_feed_post_resonates_user_time` (`user_id`, `created_at`),
  CONSTRAINT `fk_feed_post_resonates_post` FOREIGN KEY (`usage_record_id`) REFERENCES `skill_usage_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feed_post_resonates_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feed_post_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usage_record_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL,
  `content` VARCHAR(1000) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_feed_post_comments_post_time` (`usage_record_id`, `created_at`),
  KEY `idx_feed_post_comments_parent` (`parent_id`, `created_at`),
  KEY `idx_feed_post_comments_user_time` (`user_id`, `created_at`),
  CONSTRAINT `fk_feed_post_comments_post` FOREIGN KEY (`usage_record_id`) REFERENCES `skill_usage_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feed_post_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feed_post_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `feed_post_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feed_post_comment_likes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `comment_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feed_post_comment_likes_comment_user` (`comment_id`, `user_id`),
  KEY `idx_feed_post_comment_likes_user_time` (`user_id`, `created_at`),
  CONSTRAINT `fk_feed_post_comment_likes_comment` FOREIGN KEY (`comment_id`) REFERENCES `feed_post_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feed_post_comment_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skill_feedbacks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `usage_record_id` BIGINT UNSIGNED DEFAULT NULL,
  `status` ENUM('success','normal','fail') NOT NULL,
  `comment` VARCHAR(1000) NOT NULL,
  `model_name` VARCHAR(64) DEFAULT NULL,
  `input_tokens` INT UNSIGNED DEFAULT NULL,
  `output_tokens` INT UNSIGNED DEFAULT NULL,
  `total_tokens` INT UNSIGNED DEFAULT NULL,
  `cost_amount` DECIMAL(12,4) DEFAULT NULL,
  `is_public` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_skill_feedbacks_usage_record` (`usage_record_id`),
  KEY `idx_skill_feedbacks_skill_time` (`skill_id`, `created_at`),
  KEY `idx_skill_feedbacks_user_time` (`user_id`, `created_at`),
  KEY `idx_skill_feedbacks_status` (`status`),
  CONSTRAINT `fk_skill_feedbacks_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_feedbacks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_feedbacks_usage` FOREIGN KEY (`usage_record_id`) REFERENCES `skill_usage_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_feedbacks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `type` ENUM('suggestion','bug','content','other') NOT NULL DEFAULT 'other',
  `content` VARCHAR(1000) NOT NULL,
  `contact` VARCHAR(120) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_app_feedbacks_type_time` (`type`, `created_at`),
  KEY `idx_app_feedbacks_user_time` (`user_id`, `created_at`),
  CONSTRAINT `fk_app_feedbacks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_follows` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `follower_id`  BIGINT UNSIGNED NOT NULL COMMENT '关注者',
  `followed_id`  BIGINT UNSIGNED NOT NULL COMMENT '被关注者',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_follows` (`follower_id`, `followed_id`),
  KEY `idx_user_follows_followed` (`followed_id`, `created_at`),
  CONSTRAINT `fk_user_follows_follower` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_follows_followed` FOREIGN KEY (`followed_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `drafts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(120) DEFAULT NULL,
  `brief` VARCHAR(500) DEFAULT NULL,
  `category_id` BIGINT UNSIGNED DEFAULT NULL,
  `scene` VARCHAR(32) DEFAULT NULL,
  `tags_json` JSON DEFAULT NULL,
  `prompt` LONGTEXT DEFAULT NULL,
  `system_prompt` LONGTEXT DEFAULT NULL,
  `user_template` LONGTEXT DEFAULT NULL,
  `full_prompt` LONGTEXT DEFAULT NULL,
  `full_prompt_html` LONGTEXT DEFAULT NULL,
  `variable_notes` TEXT DEFAULT NULL,
  `variables_json` JSON DEFAULT NULL,
  `steps_json` JSON DEFAULT NULL,
  `use_scenes_json` JSON DEFAULT NULL,
  `images_json` JSON DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0=editing,1=published,2=discarded',
  `last_saved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_skill_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_drafts_user_status_time` (`user_id`, `status`, `last_saved_at`),
  KEY `idx_drafts_published_skill` (`published_skill_id`),
  CONSTRAINT `fk_drafts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_drafts_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_drafts_published_skill` FOREIGN KEY (`published_skill_id`) REFERENCES `skills` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`name`, `sort_no`) VALUES
('写作', 10), ('编程', 20), ('自媒体', 30), ('办公', 40),
('运营', 50), ('学习', 60), ('设计', 70), ('电商', 80)
ON DUPLICATE KEY UPDATE `sort_no` = VALUES(`sort_no`);
