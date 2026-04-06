-- Supabase 数据库表结构
-- 请在 Supabase Dashboard -> SQL Editor 中执行此脚本

-- 1. 删除旧表（如果存在）
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS personnel CASCADE;

-- 2. 创建项目表（使用 TEXT 类型的 ID 以支持前端生成的字符串 ID）
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location JSONB DEFAULT '{}',
    scale JSONB DEFAULT '{}',
    costs JSONB DEFAULT '{}',
    lifecycle JSONB DEFAULT '{}',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建人员表（使用 TEXT 类型的 ID 以支持前端生成的字符串 ID）
-- 注意：使用 birthday 代替 age，年龄会根据出生日期自动计算
CREATE TABLE personnel (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT DEFAULT '男',
    birthday DATE,  -- 出生日期，年龄会根据此字段自动计算
    department TEXT DEFAULT '',
    position TEXT DEFAULT '',
    education TEXT DEFAULT '',
    major TEXT DEFAULT '',
    title TEXT DEFAULT '',
    certificates TEXT DEFAULT '',
    experience JSONB DEFAULT '{}',
    custom_skills JSONB DEFAULT '[]',
    capabilities JSONB DEFAULT '{}',
    max_projects INTEGER DEFAULT 3,
    contact JSONB DEFAULT '{}',
    current_projects JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 启用 RLS (Row Level Security)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;

-- 4. 设置公开访问策略（允许所有操作）
DROP POLICY IF EXISTS "Allow all for projects" ON projects;
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for personnel" ON personnel;
CREATE POLICY "Allow all for personnel" ON personnel FOR ALL USING (true) WITH CHECK (true);

-- 5. 开启自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_personnel_updated_at ON personnel;
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 启用 API 访问
-- (Supabase 默认已开启 REST API，无需额外配置)
