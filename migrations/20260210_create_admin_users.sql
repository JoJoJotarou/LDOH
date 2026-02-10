-- Migration: 管理后台基础设施
-- Date: 2026-02-10

-- 1. 创建管理员标记表
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. site 表新增逻辑删除字段
ALTER TABLE site ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE site ADD COLUMN deleted_by INTEGER DEFAULT NULL;

-- 未删除站点的部分索引，加速前台查询
CREATE INDEX idx_site_deleted_at ON site(deleted_at) WHERE deleted_at IS NULL;

-- 3. 插入初始超级管理员（替换为你的 LinuxDo user_id）
-- INSERT INTO admin_users (user_id, role) VALUES (你的user_id, 'super_admin');
