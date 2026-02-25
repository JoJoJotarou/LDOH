-- Migration: 新增 requires_invite_code 字段（是否需要邀请码）
-- 默认值：false（不需要邀请码）

ALTER TABLE public.site
  ADD COLUMN IF NOT EXISTS requires_invite_code boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.site.requires_invite_code IS '注册时是否需要邀请码';

-- 更新 create_site_with_notification 函数，添加 p_requires_invite_code 参数
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
  p_requires_invite_code boolean,
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
    requires_invite_code,
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
    COALESCE(p_requires_invite_code, false),
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
