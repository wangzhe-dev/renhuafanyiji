-- ============================================================
-- Migration: 给 tags 表加 category_id，实现分类联动标签建议
-- 日期: 2026-03-22
-- ============================================================

-- 1. 加字段（nullable，兼容已有无分类标签）
ALTER TABLE tags
  ADD COLUMN category_id INT UNSIGNED DEFAULT NULL AFTER slug;

-- 2. 加索引（按分类查标签建议时用到）
ALTER TABLE tags
  ADD INDEX idx_tags_category_id (category_id);

-- 3. 加外键（categories 删除时自动置 NULL，不级联删 tag）
ALTER TABLE tags
  ADD CONSTRAINT fk_tags_category
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- ============================================================
-- 4. 初始化现有 tags 的分类归属
--    用子查询按 categories.name 匹配，避免硬编码 ID
-- ============================================================

-- 设计
UPDATE tags SET category_id = (SELECT id FROM categories WHERE name = '设计' LIMIT 1)
WHERE id IN (2001, 2002, 2003, 2043);

-- 编程
UPDATE tags SET category_id = (SELECT id FROM categories WHERE name = '编程' LIMIT 1)
WHERE id IN (2004, 2005, 2006, 2022, 2023, 2024, 2034, 2044);

-- 办公
UPDATE tags SET category_id = (SELECT id FROM categories WHERE name = '办公' LIMIT 1)
WHERE id IN (2007, 2008, 2009, 2036, 2037, 2047);

-- 电商
UPDATE tags SET category_id = (SELECT id FROM categories WHERE name = '电商' LIMIT 1)
WHERE id IN (2010, 2011, 2012, 2040, 2045);

-- 自媒体
UPDATE tags SET category_id = (SELECT id FROM categories WHERE name = '自媒体' LIMIT 1)
WHERE id IN (2013, 2014, 2015, 2028, 2029, 2030, 2046);

-- 学习
UPDATE tags SET category_id = (SELECT id FROM categories WHERE name = '学习' LIMIT 1)
WHERE id IN (2016, 2017, 2018, 2049);

-- 运营
UPDATE tags SET category_id = (SELECT id FROM categories WHERE name = '运营' LIMIT 1)
WHERE id IN (2019, 2020, 2021, 2048);

-- 写作
UPDATE tags SET category_id = (SELECT id FROM categories WHERE name = '写作' LIMIT 1)
WHERE id IN (2031, 2032, 2033, 2041, 2042);

-- ============================================================
-- 验证（执行后确认数量正确）
-- SELECT category_id, COUNT(*) as cnt FROM tags GROUP BY category_id;
-- ============================================================
