-- ============================================
-- Supabase 表结构迁移脚本
-- 将 personnel 表的 age 字段改为 birthday 字段
-- ============================================
-- 
-- 执行步骤：
-- 1. 登录 Supabase Dashboard: https://app.supabase.com
-- 2. 选择项目: pwxrijygugjxhpcjveef
-- 3. 进入 SQL Editor
-- 4. 粘贴以下 SQL 并执行
-- ============================================

-- 1. 添加 birthday 列（如果不存在）
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS birthday DATE;

-- 2. 将现有的 age 数据转换为 birthday
-- 假设 age 是当前年龄，倒推出生日期
UPDATE personnel 
SET birthday = CURRENT_DATE - INTERVAL '1 year' * COALESCE(age, 30) 
WHERE birthday IS NULL;

-- 3. （可选）删除旧的 age 列 - 请在确认数据迁移成功后取消注释并执行
-- ALTER TABLE personnel DROP COLUMN IF EXISTS age;

-- 4. 验证更新结果
SELECT id, name, birthday, 
       EXTRACT(YEAR FROM AGE(CURRENT_DATE, birthday))::INTEGER AS calculated_age
FROM personnel 
LIMIT 10;
