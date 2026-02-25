-- LDOH 数据库基线（幂等，可重复执行）

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.site (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  api_base_url text NOT NULL UNIQUE,
  rate_limit text,
  registration_limit integer NOT NULL DEFAULT 2,
  supports_immersive_translation boolean NOT NULL DEFAULT false,
  supports_ldc boolean NOT NULL DEFAULT false,
  supports_checkin boolean NOT NULL DEFAULT false,
  supports_nsfw boolean NOT NULL DEFAULT false,
  checkin_url text,
  checkin_note text,
  benefit_url text,
  status_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_runaway boolean NOT NULL DEFAULT false,
  is_fake_charity boolean NOT NULL DEFAULT false,
  is_only_maintainer_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by bigint,
  updated_by bigint
);

CREATE TABLE IF NOT EXISTS public.site_tags (
  site_id uuid NOT NULL,
  tag_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by bigint,
  CONSTRAINT site_tags_pkey PRIMARY KEY (site_id, tag_id),
  CONSTRAINT site_tags_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.site(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.site_maintainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  name text NOT NULL,
  username text,
  profile_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by bigint,
  updated_by bigint,
  CONSTRAINT site_maintainers_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.site(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.site_extension_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by bigint,
  updated_by bigint,
  CONSTRAINT site_extension_links_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.site(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.site_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  action text NOT NULL,
  actor_id bigint NOT NULL,
  actor_username text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_logs_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.site(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  min_trust_level integer,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by bigint,
  updated_by bigint
);

CREATE TABLE IF NOT EXISTS public.site_health_status (
  site_id uuid PRIMARY KEY,
  status text NOT NULL,
  http_status integer,
  latency_ms integer,
  checked_at timestamptz NOT NULL DEFAULT now(),
  error text,
  response_url text,
  CONSTRAINT site_health_status_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.site(id) ON DELETE CASCADE,
  CONSTRAINT site_health_status_status_check
    CHECK (status IN ('up', 'slow', 'down'))
);

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'bearer',
  access_expires_at timestamptz NOT NULL,
  session_expires_at timestamptz NOT NULL,
  user_id bigint,
  user_username text,
  user_trust_level integer,
  user_fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'super_admin'))
);

CREATE TABLE IF NOT EXISTS public.site_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  reporter_id integer NOT NULL,
  reporter_username text NOT NULL DEFAULT '',
  report_type text NOT NULL DEFAULT 'fake_charity',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by integer,
  CONSTRAINT site_reports_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.site(id) ON DELETE CASCADE,
  CONSTRAINT site_reports_report_type_check
    CHECK (report_type IN ('runaway', 'fake_charity')),
  CONSTRAINT site_reports_status_check
    CHECK (status IN ('pending', 'reviewed', 'dismissed'))
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

ALTER TABLE public.site
  ADD COLUMN IF NOT EXISTS supports_nsfw boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_runaway boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_fake_charity boolean NOT NULL DEFAULT false;

ALTER TABLE public.site_reports
  ADD COLUMN IF NOT EXISTS report_type text;

UPDATE public.site_reports
SET report_type = 'fake_charity'
WHERE report_type IS NULL;

ALTER TABLE public.site_reports
  ALTER COLUMN report_type SET DEFAULT 'fake_charity',
  ALTER COLUMN report_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'site_reports_report_type_check'
      AND conrelid = 'public.site_reports'::regclass
  ) THEN
    ALTER TABLE public.site_reports
      ADD CONSTRAINT site_reports_report_type_check
      CHECK (report_type IN ('runaway', 'fake_charity'));
  END IF;
END;
$$;

ALTER TABLE public.system_notifications
  ADD COLUMN IF NOT EXISTS min_trust_level integer;

COMMENT ON TABLE public.site IS '站点主表';
COMMENT ON COLUMN public.site.id IS '站点主键ID';
COMMENT ON COLUMN public.site.name IS '站点名称';
COMMENT ON COLUMN public.site.description IS '站点描述';
COMMENT ON COLUMN public.site.api_base_url IS '站点API基础地址';
COMMENT ON COLUMN public.site.rate_limit IS '速率限制说明';
COMMENT ON COLUMN public.site.registration_limit IS '最低注册等级限制';
COMMENT ON COLUMN public.site.supports_immersive_translation IS '是否支持沉浸式翻译';
COMMENT ON COLUMN public.site.supports_ldc IS '是否支持LDC';
COMMENT ON COLUMN public.site.supports_checkin IS '是否支持签到';
COMMENT ON COLUMN public.site.supports_nsfw IS '是否支持NSFW内容';
COMMENT ON COLUMN public.site.checkin_url IS '签到地址';
COMMENT ON COLUMN public.site.checkin_note IS '签到说明';
COMMENT ON COLUMN public.site.benefit_url IS '福利地址';
COMMENT ON COLUMN public.site.status_url IS '状态页地址';
COMMENT ON COLUMN public.site.is_active IS '是否启用';
COMMENT ON COLUMN public.site.is_runaway IS '是否跑路（关站）';
COMMENT ON COLUMN public.site.is_fake_charity IS '是否伪公益站点';
COMMENT ON COLUMN public.site.is_only_maintainer_visible IS '是否前台仅站长可见';
COMMENT ON COLUMN public.site.created_at IS '创建时间';
COMMENT ON COLUMN public.site.updated_at IS '更新时间';
COMMENT ON COLUMN public.site.created_by IS '创建人用户ID';
COMMENT ON COLUMN public.site.updated_by IS '更新人用户ID';

COMMENT ON TABLE public.site_tags IS '站点标签关联表';
COMMENT ON COLUMN public.site_tags.site_id IS '站点ID';
COMMENT ON COLUMN public.site_tags.tag_id IS '标签标识';
COMMENT ON COLUMN public.site_tags.created_at IS '创建时间';
COMMENT ON COLUMN public.site_tags.created_by IS '创建人用户ID';

COMMENT ON TABLE public.site_maintainers IS '站点维护者表';
COMMENT ON COLUMN public.site_maintainers.id IS '维护者记录主键';
COMMENT ON COLUMN public.site_maintainers.site_id IS '站点ID';
COMMENT ON COLUMN public.site_maintainers.name IS '维护者名称';
COMMENT ON COLUMN public.site_maintainers.username IS '维护者用户名';
COMMENT ON COLUMN public.site_maintainers.profile_url IS '维护者主页地址';
COMMENT ON COLUMN public.site_maintainers.sort_order IS '排序值';
COMMENT ON COLUMN public.site_maintainers.created_at IS '创建时间';
COMMENT ON COLUMN public.site_maintainers.updated_at IS '更新时间';
COMMENT ON COLUMN public.site_maintainers.created_by IS '创建人用户ID';
COMMENT ON COLUMN public.site_maintainers.updated_by IS '更新人用户ID';

COMMENT ON TABLE public.site_extension_links IS '站点扩展链接表';
COMMENT ON COLUMN public.site_extension_links.id IS '扩展链接主键';
COMMENT ON COLUMN public.site_extension_links.site_id IS '站点ID';
COMMENT ON COLUMN public.site_extension_links.label IS '链接名称';
COMMENT ON COLUMN public.site_extension_links.url IS '链接地址';
COMMENT ON COLUMN public.site_extension_links.sort_order IS '排序值';
COMMENT ON COLUMN public.site_extension_links.created_at IS '创建时间';
COMMENT ON COLUMN public.site_extension_links.updated_at IS '更新时间';
COMMENT ON COLUMN public.site_extension_links.created_by IS '创建人用户ID';
COMMENT ON COLUMN public.site_extension_links.updated_by IS '更新人用户ID';

COMMENT ON TABLE public.site_logs IS '站点操作日志表';
COMMENT ON COLUMN public.site_logs.id IS '日志主键';
COMMENT ON COLUMN public.site_logs.site_id IS '站点ID';
COMMENT ON COLUMN public.site_logs.action IS '操作类型';
COMMENT ON COLUMN public.site_logs.actor_id IS '操作人用户ID';
COMMENT ON COLUMN public.site_logs.actor_username IS '操作人用户名';
COMMENT ON COLUMN public.site_logs.message IS '操作说明';
COMMENT ON COLUMN public.site_logs.created_at IS '创建时间';

COMMENT ON TABLE public.system_notifications IS '系统通知表';
COMMENT ON COLUMN public.system_notifications.id IS '通知主键';
COMMENT ON COLUMN public.system_notifications.title IS '通知标题';
COMMENT ON COLUMN public.system_notifications.content IS '通知内容';
COMMENT ON COLUMN public.system_notifications.min_trust_level IS '最低可见信任等级';
COMMENT ON COLUMN public.system_notifications.valid_from IS '生效时间';
COMMENT ON COLUMN public.system_notifications.valid_until IS '失效时间';
COMMENT ON COLUMN public.system_notifications.is_active IS '是否启用';
COMMENT ON COLUMN public.system_notifications.created_at IS '创建时间';
COMMENT ON COLUMN public.system_notifications.updated_at IS '更新时间';
COMMENT ON COLUMN public.system_notifications.created_by IS '创建人用户ID';
COMMENT ON COLUMN public.system_notifications.updated_by IS '更新人用户ID';

COMMENT ON TABLE public.site_health_status IS '站点健康状态表';
COMMENT ON COLUMN public.site_health_status.site_id IS '站点ID';
COMMENT ON COLUMN public.site_health_status.status IS '健康状态';
COMMENT ON COLUMN public.site_health_status.http_status IS 'HTTP状态码';
COMMENT ON COLUMN public.site_health_status.latency_ms IS '延迟毫秒值';
COMMENT ON COLUMN public.site_health_status.checked_at IS '最近检查时间';
COMMENT ON COLUMN public.site_health_status.error IS '错误信息';
COMMENT ON COLUMN public.site_health_status.response_url IS '最终响应地址';

COMMENT ON TABLE public.auth_sessions IS '认证会话表';
COMMENT ON COLUMN public.auth_sessions.id IS '会话主键ID';
COMMENT ON COLUMN public.auth_sessions.access_token IS '访问令牌';
COMMENT ON COLUMN public.auth_sessions.refresh_token IS '刷新令牌';
COMMENT ON COLUMN public.auth_sessions.token_type IS '令牌类型';
COMMENT ON COLUMN public.auth_sessions.access_expires_at IS '访问令牌过期时间';
COMMENT ON COLUMN public.auth_sessions.session_expires_at IS '会话过期时间';
COMMENT ON COLUMN public.auth_sessions.user_id IS '用户ID';
COMMENT ON COLUMN public.auth_sessions.user_username IS '用户名';
COMMENT ON COLUMN public.auth_sessions.user_trust_level IS '用户信任等级';
COMMENT ON COLUMN public.auth_sessions.user_fetched_at IS '用户缓存抓取时间';
COMMENT ON COLUMN public.auth_sessions.created_at IS '创建时间';
COMMENT ON COLUMN public.auth_sessions.updated_at IS '更新时间';

COMMENT ON TABLE public.admin_users IS '管理员用户表';
COMMENT ON COLUMN public.admin_users.id IS '管理员记录主键';
COMMENT ON COLUMN public.admin_users.user_id IS '管理员用户ID';
COMMENT ON COLUMN public.admin_users.role IS '管理员角色';
COMMENT ON COLUMN public.admin_users.created_at IS '创建时间';

COMMENT ON TABLE public.site_reports IS '站点报告表';
COMMENT ON COLUMN public.site_reports.id IS '报告记录主键';
COMMENT ON COLUMN public.site_reports.site_id IS '被报告站点ID';
COMMENT ON COLUMN public.site_reports.reporter_id IS '报告人用户ID';
COMMENT ON COLUMN public.site_reports.reporter_username IS '报告人用户名';
COMMENT ON COLUMN public.site_reports.report_type IS '报告类型（runaway/fake_charity）';
COMMENT ON COLUMN public.site_reports.reason IS '报告原因';
COMMENT ON COLUMN public.site_reports.status IS '报告状态';
COMMENT ON COLUMN public.site_reports.created_at IS '创建时间';
COMMENT ON COLUMN public.site_reports.reviewed_at IS '审核时间';
COMMENT ON COLUMN public.site_reports.reviewed_by IS '审核人用户ID';

COMMENT ON TABLE public.system_settings IS '系统配置表';
COMMENT ON COLUMN public.system_settings.key IS '配置键';
COMMENT ON COLUMN public.system_settings.value IS '配置值';

CREATE INDEX IF NOT EXISTS site_tags_site_id_idx ON public.site_tags(site_id);
CREATE INDEX IF NOT EXISTS site_tags_tag_id_idx ON public.site_tags(tag_id);
CREATE INDEX IF NOT EXISTS site_maintainers_site_id_idx ON public.site_maintainers(site_id);
CREATE INDEX IF NOT EXISTS site_extension_links_site_id_idx ON public.site_extension_links(site_id);
CREATE INDEX IF NOT EXISTS site_logs_site_id_idx ON public.site_logs(site_id);
CREATE INDEX IF NOT EXISTS site_logs_created_at_idx ON public.site_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS auth_sessions_session_expires_at_idx ON public.auth_sessions(session_expires_at);
CREATE INDEX IF NOT EXISTS system_notifications_valid_from_idx ON public.system_notifications(valid_from DESC);
CREATE INDEX IF NOT EXISTS system_notifications_valid_until_idx ON public.system_notifications(valid_until);
CREATE INDEX IF NOT EXISTS system_notifications_is_active_idx ON public.system_notifications(is_active);
DROP INDEX IF EXISTS public.idx_site_deleted_at;
DROP INDEX IF EXISTS public.idx_site_reports_unique_pending;
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_reports_unique_pending ON public.site_reports(site_id, reporter_id, report_type) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_site_reports_site_id ON public.site_reports(site_id);
CREATE INDEX IF NOT EXISTS idx_site_reports_status ON public.site_reports(status) WHERE status = 'pending';

DROP FUNCTION IF EXISTS public.create_site_with_notification(
  text,
  text,
  integer,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  text,
  text,
  text,
  text,
  text,
  boolean,
  bigint,
  text,
  bigint,
  text[],
  jsonb,
  jsonb
);

CREATE FUNCTION public.create_site_with_notification(
  p_name text,
  p_description text,
  p_registration_limit integer,
  p_api_base_url text,
  p_supports_immersive_translation boolean,
  p_supports_ldc boolean,
  p_supports_checkin boolean,
  p_supports_nsfw boolean,
  p_checkin_url text,
  p_checkin_note text,
  p_benefit_url text,
  p_rate_limit text,
  p_status_url text,
  p_is_only_maintainer_visible boolean,
  p_actor_id bigint,
  p_actor_username text,
  p_created_by bigint,
  p_tags text[],
  p_maintainers jsonb,
  p_extension_links jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_site_id uuid;
BEGIN
  INSERT INTO public.site (
    name,
    description,
    registration_limit,
    api_base_url,
    supports_immersive_translation,
    supports_ldc,
    supports_checkin,
    supports_nsfw,
    checkin_url,
    checkin_note,
    benefit_url,
    rate_limit,
    status_url,
    is_only_maintainer_visible,
    created_by,
    updated_by
  ) VALUES (
    p_name,
    p_description,
    COALESCE(p_registration_limit, 0),
    p_api_base_url,
    COALESCE(p_supports_immersive_translation, false),
    COALESCE(p_supports_ldc, false),
    COALESCE(p_supports_checkin, false),
    COALESCE(p_supports_nsfw, false),
    p_checkin_url,
    p_checkin_note,
    p_benefit_url,
    p_rate_limit,
    p_status_url,
    COALESCE(p_is_only_maintainer_visible, false),
    p_created_by,
    p_created_by
  )
  RETURNING id INTO v_site_id;

  IF p_tags IS NOT NULL AND array_length(p_tags, 1) > 0 THEN
    INSERT INTO public.site_tags (site_id, tag_id, created_by)
    SELECT v_site_id, tag_id, p_created_by
    FROM unnest(p_tags) AS tag_id
    WHERE tag_id IS NOT NULL AND length(tag_id) > 0;
  END IF;

  IF p_maintainers IS NULL
     OR jsonb_typeof(p_maintainers) <> 'array'
     OR jsonb_array_length(p_maintainers) = 0 THEN
    RAISE EXCEPTION 'At least one maintainer required';
  END IF;

  INSERT INTO public.site_maintainers (
    site_id,
    name,
    username,
    profile_url,
    sort_order,
    created_by,
    updated_by
  )
  SELECT
    v_site_id,
    COALESCE(item->>'name', ''),
    NULLIF(item->>'username', ''),
    NULLIF(item->>'profileUrl', ''),
    (ordinality - 1),
    p_created_by,
    p_created_by
  FROM jsonb_array_elements(p_maintainers) WITH ORDINALITY AS t(item, ordinality);

  IF p_extension_links IS NOT NULL
     AND jsonb_typeof(p_extension_links) = 'array'
     AND jsonb_array_length(p_extension_links) > 0 THEN
    INSERT INTO public.site_extension_links (
      site_id,
      label,
      url,
      sort_order,
      created_by,
      updated_by
    )
    SELECT
      v_site_id,
      COALESCE(item->>'label', ''),
      COALESCE(item->>'url', ''),
      (ordinality - 1),
      p_created_by,
      p_created_by
    FROM jsonb_array_elements(p_extension_links) WITH ORDINALITY AS t(item, ordinality);
  END IF;

  INSERT INTO public.site_logs (
    site_id,
    action,
    actor_id,
    actor_username,
    message
  ) VALUES (
    v_site_id,
    'CREATE',
    p_actor_id,
    p_actor_username,
    '创建站点'
  );

  INSERT INTO public.system_notifications (
    title,
    content,
    min_trust_level,
    valid_until,
    created_by,
    updated_by
  ) VALUES (
    '系统公告',
    '感谢 **' || p_actor_username || '** 佬添加公益站 [**' || p_name || '**](' || p_api_base_url || ')，快去看看吧~',
    COALESCE(p_registration_limit, 0),
    now() + interval '7 days',
    p_created_by,
    p_created_by
  );

  RETURN v_site_id;
END;
$$;
