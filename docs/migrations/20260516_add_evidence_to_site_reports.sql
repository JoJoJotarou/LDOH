-- 为 site_reports 表添加证据字段
-- 用于防止举报滥用，要求提供有效证据

ALTER TABLE public.site_reports
  ADD COLUMN IF NOT EXISTS evidence_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidence_type text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.site_reports.evidence_url IS '证据URL（截图图片链接或站长公告链接）';
COMMENT ON COLUMN public.site_reports.evidence_type IS '证据类型（screenshot/announcement_link）';
