CREATE TABLE site_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL,
  reporter_username TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / reviewed / dismissed
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  reviewed_by INTEGER DEFAULT NULL
);

-- 同一用户对同一站点只能有一条 pending 举报
CREATE UNIQUE INDEX idx_site_reports_unique_pending
  ON site_reports(site_id, reporter_id) WHERE status = 'pending';
CREATE INDEX idx_site_reports_site_id ON site_reports(site_id);
CREATE INDEX idx_site_reports_status ON site_reports(status) WHERE status = 'pending';
