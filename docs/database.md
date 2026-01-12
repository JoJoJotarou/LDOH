# 数据库结构（Supabase）

本项目使用 Supabase Postgres。以下为当前生产/开发库需要保持一致的表结构、约束与索引。

## 表：site

| 字段 | 类型 | 可空 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 否 | gen_random_uuid() | 站点主键 |
| name | text | 否 | - | 站点名称 |
| description | text | 是 | - | 描述 |
| api_base_url | text | 否 | - | API Base URL（唯一） |
| rate_limit | text | 是 | - | 速率限制 |
| registration_limit | integer | 否 | 2 | 登记等级（0-3） |
| supports_immersive_translation | boolean | 否 | false | 支持沉浸式翻译 |
| supports_ldc | boolean | 否 | false | 支持 LDC |
| supports_checkin | boolean | 否 | false | 支持签到 |
| checkin_url | text | 是 | - | 签到地址 |
| checkin_note | text | 是 | - | 签到说明 |
| benefit_url | text | 是 | - | 福利站 |
| status_url | text | 是 | - | 状态页 |
| is_active | boolean | 否 | true | 保留字段 |
| is_visible | boolean | 否 | true | 是否在列表展示 |
| created_at | timestamptz | 否 | now() | 创建时间 |
| updated_at | timestamptz | 否 | now() | 更新时间 |
| created_by | bigint | 是 | - | 创建者（LD user_id） |
| updated_by | bigint | 是 | - | 更新者（LD user_id） |

约束：
- UNIQUE(api_base_url)
- PRIMARY KEY(id)

索引：
- site_api_base_url_key (UNIQUE)
- site_pkey (UNIQUE)

## 表：site_tags

| 字段 | 类型 | 可空 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| site_id | uuid | 否 | - | 站点 ID |
| tag_id | text | 否 | - | 标签（纯字符串） |
| created_at | timestamptz | 否 | now() | 创建时间 |
| created_by | bigint | 是 | - | 创建者（LD user_id） |

约束：
- PRIMARY KEY(site_id, tag_id)
- FOREIGN KEY(site_id) REFERENCES site(id) ON DELETE CASCADE

索引：
- site_tags_pkey (UNIQUE)
- site_tags_site_id_idx
- site_tags_tag_id_idx

## 表：site_maintainers

| 字段 | 类型 | 可空 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 否 | gen_random_uuid() | 主键 |
| site_id | uuid | 否 | - | 站点 ID |
| name | text | 否 | - | 站长显示名称 |
| username | text | 是 | - | 站长用户名（LinuxDo username） |
| profile_url | text | 是 | - | 站长主页链接（LinuxDo 个人页） |
| sort_order | integer | 否 | 0 | 排序 |
| created_at | timestamptz | 否 | now() | 创建时间 |
| updated_at | timestamptz | 否 | now() | 更新时间 |
| created_by | bigint | 是 | - | 创建者（LD user_id） |
| updated_by | bigint | 是 | - | 更新者（LD user_id） |

约束：
- PRIMARY KEY(id)
- FOREIGN KEY(site_id) REFERENCES site(id) ON DELETE CASCADE

索引：
- site_maintainers_pkey (UNIQUE)
- site_maintainers_site_id_idx

## 表：site_extension_links

| 字段 | 类型 | 可空 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 否 | gen_random_uuid() | 主键 |
| site_id | uuid | 否 | - | 站点 ID |
| label | text | 否 | - | 名称 |
| url | text | 否 | - | 链接 |
| sort_order | integer | 否 | 0 | 排序 |
| created_at | timestamptz | 否 | now() | 创建时间 |
| updated_at | timestamptz | 否 | now() | 更新时间 |
| created_by | bigint | 是 | - | 创建者（LD user_id） |
| updated_by | bigint | 是 | - | 更新者（LD user_id） |

约束：
- PRIMARY KEY(id)
- FOREIGN KEY(site_id) REFERENCES site(id) ON DELETE CASCADE

索引：
- site_extension_links_pkey (UNIQUE)
- site_extension_links_site_id_idx

## 表：site_logs

| 字段 | 类型 | 可空 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 否 | gen_random_uuid() | 日志主键 |
| site_id | uuid | 否 | - | 站点 ID |
| action | text | 否 | - | 操作类型（CREATE/UPDATE） |
| actor_id | bigint | 否 | - | 操作人 LD user_id |
| actor_username | text | 否 | - | 操作人用户名 |
| message | text | 否 | - | 变更说明 |
| created_at | timestamptz | 否 | now() | 创建时间 |

约束：
- PRIMARY KEY(id)
- FOREIGN KEY(site_id) REFERENCES site(id) ON DELETE CASCADE

索引：
- site_logs_pkey (UNIQUE)
- site_logs_site_id_idx
- site_logs_created_at_idx

## 表：auth_sessions

| 字段 | 类型 | 可空 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 否 | gen_random_uuid() | 会话 ID（写入 httpOnly cookie） |
| access_token | text | 否 | - | 访问令牌（短期） |
| refresh_token | text | 否 | - | 刷新令牌（长期，仅服务端保存） |
| token_type | text | 否 | bearer | 令牌类型 |
| access_expires_at | timestamptz | 否 | - | access_token 过期时间 |
| session_expires_at | timestamptz | 否 | - | 会话过期时间（对齐 cookie Max-Age） |
| user_id | bigint | 是 | - | 缓存的 LD user_id |
| user_username | text | 是 | - | 缓存的 LD username |
| user_trust_level | integer | 是 | - | 缓存的 LD trust_level |
| user_fetched_at | timestamptz | 是 | - | 缓存更新时间 |
| created_at | timestamptz | 否 | now() | 创建时间 |
| updated_at | timestamptz | 否 | now() | 更新时间 |

约束：
- PRIMARY KEY(id)

索引：
- auth_sessions_pkey (UNIQUE)
- auth_sessions_session_expires_at_idx

## 表：system_notifications

| 字段 | 类型 | 可空 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | 否 | gen_random_uuid() | 通知主键 |
| title | text | 否 | - | 通知标题 |
| content | text | 否 | - | 通知内容（支持 Markdown 格式，可包含链接） |
| valid_from | timestamptz | 否 | now() | 生效时间 |
| valid_until | timestamptz | 是 | - | 失效时间（null 表示永久有效） |
| is_active | boolean | 否 | true | 是否启用 |
| created_at | timestamptz | 否 | now() | 创建时间 |
| updated_at | timestamptz | 否 | now() | 更新时间 |
| created_by | bigint | 是 | - | 创建者（LD user_id） |
| updated_by | bigint | 是 | - | 更新者（LD user_id） |

约束：
- PRIMARY KEY(id)

索引：
- system_notifications_pkey (UNIQUE)
- system_notifications_valid_from_idx
- system_notifications_valid_until_idx
- system_notifications_is_active_idx
