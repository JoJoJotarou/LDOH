
CREATE TABLE public.auth_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'bearer'::text,
  access_expires_at timestamp with time zone NOT NULL,
  session_expires_at timestamp with time zone NOT NULL,
  user_id bigint,
  user_username text,
  user_trust_level integer,
  user_fetched_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.site (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by bigint,
  updated_by bigint,
  is_visible boolean NOT NULL DEFAULT true,
  CONSTRAINT site_pkey PRIMARY KEY (id)
);
CREATE TABLE public.site_extension_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by bigint,
  updated_by bigint,
  CONSTRAINT site_extension_links_pkey PRIMARY KEY (id),
  CONSTRAINT site_extension_links_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.site(id)
);
CREATE TABLE public.site_maintainers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  name text NOT NULL,
  username text,
  profile_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by bigint,
  updated_by bigint,
  CONSTRAINT site_maintainers_pkey PRIMARY KEY (id),
  CONSTRAINT site_maintainers_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.site(id)
);
CREATE TABLE public.site_tags (
  site_id uuid NOT NULL,
  tag_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by bigint,
  CONSTRAINT site_tags_pkey PRIMARY KEY (site_id, tag_id),
  CONSTRAINT site_tags_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.site(id)
);

CREATE TABLE public.site_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  action text NOT NULL,
  actor_id bigint NOT NULL,
  actor_username text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT site_logs_pkey PRIMARY KEY (id),
  CONSTRAINT site_logs_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.site(id)
);

CREATE TABLE public.system_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  min_trust_level integer,
  valid_from timestamp with time zone NOT NULL DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by bigint,
  updated_by bigint,
  CONSTRAINT system_notifications_pkey PRIMARY KEY (id)
);
