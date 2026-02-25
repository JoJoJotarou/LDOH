# 数据库结构（最新）

> 说明：每张数据表均提供 3 个 Markdown 表：`fields`、`indexes`、`constraints`。

## 表：site

### fields

| 字段                           | 类型        | 可空 | 默认值            | 字段描述           |
| ------------------------------ | ----------- | ---- | ----------------- | ------------------ |
| id                             | uuid        | 否   | gen_random_uuid() | 站点主键ID         |
| name                           | text        | 否   | -                 | 站点名称           |
| description                    | text        | 是   | -                 | 站点描述           |
| api_base_url                   | text        | 否   | -                 | 站点API基础地址    |
| rate_limit                     | text        | 是   | -                 | 速率限制说明       |
| registration_limit             | integer     | 否   | 2                 | 最低注册等级限制   |
| supports_immersive_translation | boolean     | 否   | false             | 是否支持沉浸式翻译 |
| supports_ldc                   | boolean     | 否   | false             | 是否支持LDC        |
| supports_checkin               | boolean     | 否   | false             | 是否支持签到       |
| supports_nsfw                  | boolean     | 否   | false             | 是否支持NSFW内容   |
| checkin_url                    | text        | 是   | -                 | 签到地址           |
| checkin_note                   | text        | 是   | -                 | 签到说明           |
| benefit_url                    | text        | 是   | -                 | 福利地址           |
| status_url                     | text        | 是   | -                 | 状态页地址         |
| is_active                      | boolean     | 否   | true              | 是否启用           |
| is_runaway                     | boolean     | 否   | false             | 是否跑路（关站）   |
| is_fake_charity                | boolean     | 否   | false             | 是否伪公益站点     |
| is_only_maintainer_visible     | boolean     | 否   | false             | 是否前台仅站长可见 |
| requires_invite_code           | boolean     | 否   | false             | 注册时是否需要邀请码 |
| created_at                     | timestamptz | 否   | now()             | 创建时间           |
| updated_at                     | timestamptz | 否   | now()             | 更新时间           |
| created_by                     | bigint      | 是   | -                 | 创建人用户ID       |
| updated_by                     | bigint      | 是   | -                 | 更新人用户ID       |

### indexes

| 索引名                | 字段         | 类型          | 说明               |
| --------------------- | ------------ | ------------- | ------------------ |
| site_pkey             | id           | PRIMARY KEY   | 主键索引           |
| site_api_base_url_key | api_base_url | UNIQUE        | API地址唯一索引    |

### constraints

| 约束名                | 字段         | 类型        | 说明            |
| --------------------- | ------------ | ----------- | --------------- |
| site_pkey             | id           | PRIMARY KEY | 主键约束        |
| site_api_base_url_key | api_base_url | UNIQUE      | API地址唯一约束 |

## 表：site_tags

### fields

| 字段       | 类型        | 可空 | 默认值 | 字段描述     |
| ---------- | ----------- | ---- | ------ | ------------ |
| site_id    | uuid        | 否   | -      | 站点ID       |
| tag_id     | text        | 否   | -      | 标签标识     |
| created_at | timestamptz | 否   | now()  | 创建时间     |
| created_by | bigint      | 是   | -      | 创建人用户ID |

### indexes

| 索引名                | 字段           | 类型        | 说明             |
| --------------------- | -------------- | ----------- | ---------------- |
| site_tags_pkey        | site_id,tag_id | PRIMARY KEY | 联合主键索引     |
| site_tags_site_id_idx | site_id        | BTREE       | 站点维度查询索引 |
| site_tags_tag_id_idx  | tag_id         | BTREE       | 标签维度查询索引 |

### constraints

| 约束名                 | 字段           | 类型        | 说明                     |
| ---------------------- | -------------- | ----------- | ------------------------ |
| site_tags_pkey         | site_id,tag_id | PRIMARY KEY | 联合主键约束             |
| site_tags_site_id_fkey | site_id        | FOREIGN KEY | 关联 site(id) 并级联删除 |

## 表：site_maintainers

### fields

| 字段        | 类型        | 可空 | 默认值            | 字段描述       |
| ----------- | ----------- | ---- | ----------------- | -------------- |
| id          | uuid        | 否   | gen_random_uuid() | 维护者记录主键 |
| site_id     | uuid        | 否   | -                 | 站点ID         |
| name        | text        | 否   | -                 | 维护者名称     |
| username    | text        | 是   | -                 | 维护者用户名   |
| profile_url | text        | 是   | -                 | 维护者主页地址 |
| sort_order  | integer     | 否   | 0                 | 排序值         |
| created_at  | timestamptz | 否   | now()             | 创建时间       |
| updated_at  | timestamptz | 否   | now()             | 更新时间       |
| created_by  | bigint      | 是   | -                 | 创建人用户ID   |
| updated_by  | bigint      | 是   | -                 | 更新人用户ID   |

### indexes

| 索引名                       | 字段    | 类型        | 说明             |
| ---------------------------- | ------- | ----------- | ---------------- |
| site_maintainers_pkey        | id      | PRIMARY KEY | 主键索引         |
| site_maintainers_site_id_idx | site_id | BTREE       | 站点维度查询索引 |

### constraints

| 约束名                        | 字段    | 类型        | 说明                     |
| ----------------------------- | ------- | ----------- | ------------------------ |
| site_maintainers_pkey         | id      | PRIMARY KEY | 主键约束                 |
| site_maintainers_site_id_fkey | site_id | FOREIGN KEY | 关联 site(id) 并级联删除 |

## 表：site_extension_links

### fields

| 字段       | 类型        | 可空 | 默认值            | 字段描述     |
| ---------- | ----------- | ---- | ----------------- | ------------ |
| id         | uuid        | 否   | gen_random_uuid() | 扩展链接主键 |
| site_id    | uuid        | 否   | -                 | 站点ID       |
| label      | text        | 否   | -                 | 链接名称     |
| url        | text        | 否   | -                 | 链接地址     |
| sort_order | integer     | 否   | 0                 | 排序值       |
| created_at | timestamptz | 否   | now()             | 创建时间     |
| updated_at | timestamptz | 否   | now()             | 更新时间     |
| created_by | bigint      | 是   | -                 | 创建人用户ID |
| updated_by | bigint      | 是   | -                 | 更新人用户ID |

### indexes

| 索引名                           | 字段    | 类型        | 说明             |
| -------------------------------- | ------- | ----------- | ---------------- |
| site_extension_links_pkey        | id      | PRIMARY KEY | 主键索引         |
| site_extension_links_site_id_idx | site_id | BTREE       | 站点维度查询索引 |

### constraints

| 约束名                            | 字段    | 类型        | 说明                     |
| --------------------------------- | ------- | ----------- | ------------------------ |
| site_extension_links_pkey         | id      | PRIMARY KEY | 主键约束                 |
| site_extension_links_site_id_fkey | site_id | FOREIGN KEY | 关联 site(id) 并级联删除 |

## 表：site_logs

### fields

| 字段           | 类型        | 可空 | 默认值            | 字段描述     |
| -------------- | ----------- | ---- | ----------------- | ------------ |
| id             | uuid        | 否   | gen_random_uuid() | 日志主键     |
| site_id        | uuid        | 否   | -                 | 站点ID       |
| action         | text        | 否   | -                 | 操作类型     |
| actor_id       | bigint      | 否   | -                 | 操作人用户ID |
| actor_username | text        | 否   | -                 | 操作人用户名 |
| message        | text        | 否   | -                 | 操作说明     |
| created_at     | timestamptz | 否   | now()             | 创建时间     |

### indexes

| 索引名                   | 字段            | 类型        | 说明             |
| ------------------------ | --------------- | ----------- | ---------------- |
| site_logs_pkey           | id              | PRIMARY KEY | 主键索引         |
| site_logs_site_id_idx    | site_id         | BTREE       | 站点维度查询索引 |
| site_logs_created_at_idx | created_at DESC | BTREE       | 时间倒序查询索引 |

### constraints

| 约束名                 | 字段    | 类型        | 说明                     |
| ---------------------- | ------- | ----------- | ------------------------ |
| site_logs_pkey         | id      | PRIMARY KEY | 主键约束                 |
| site_logs_site_id_fkey | site_id | FOREIGN KEY | 关联 site(id) 并级联删除 |

## 表：system_notifications

### fields

| 字段            | 类型        | 可空 | 默认值            | 字段描述         |
| --------------- | ----------- | ---- | ----------------- | ---------------- |
| id              | uuid        | 否   | gen_random_uuid() | 通知主键         |
| title           | text        | 否   | -                 | 通知标题         |
| content         | text        | 否   | -                 | 通知内容         |
| min_trust_level | integer     | 是   | -                 | 最低可见信任等级 |
| valid_from      | timestamptz | 否   | now()             | 生效时间         |
| valid_until     | timestamptz | 是   | -                 | 失效时间         |
| is_active       | boolean     | 否   | true              | 是否启用         |
| created_at      | timestamptz | 否   | now()             | 创建时间         |
| updated_at      | timestamptz | 否   | now()             | 更新时间         |
| created_by      | bigint      | 是   | -                 | 创建人用户ID     |
| updated_by      | bigint      | 是   | -                 | 更新人用户ID     |

### indexes

| 索引名                               | 字段            | 类型        | 说明         |
| ------------------------------------ | --------------- | ----------- | ------------ |
| system_notifications_pkey            | id              | PRIMARY KEY | 主键索引     |
| system_notifications_valid_from_idx  | valid_from DESC | BTREE       | 生效时间索引 |
| system_notifications_valid_until_idx | valid_until     | BTREE       | 失效时间索引 |
| system_notifications_is_active_idx   | is_active       | BTREE       | 启用状态索引 |

### constraints

| 约束名                    | 字段 | 类型        | 说明     |
| ------------------------- | ---- | ----------- | -------- |
| system_notifications_pkey | id   | PRIMARY KEY | 主键约束 |

## 表：site_health_status

### fields

| 字段         | 类型        | 可空 | 默认值 | 字段描述       |
| ------------ | ----------- | ---- | ------ | -------------- |
| site_id      | uuid        | 否   | -      | 站点ID（主键） |
| status       | text        | 否   | -      | 健康状态       |
| http_status  | integer     | 是   | -      | HTTP状态码     |
| latency_ms   | integer     | 是   | -      | 延迟毫秒值     |
| checked_at   | timestamptz | 否   | now()  | 最近检查时间   |
| error        | text        | 是   | -      | 错误信息       |
| response_url | text        | 是   | -      | 最终响应地址   |

### indexes

| 索引名                  | 字段    | 类型        | 说明     |
| ----------------------- | ------- | ----------- | -------- |
| site_health_status_pkey | site_id | PRIMARY KEY | 主键索引 |

### constraints

| 约束名                          | 字段    | 类型        | 说明                     |
| ------------------------------- | ------- | ----------- | ------------------------ |
| site_health_status_pkey         | site_id | PRIMARY KEY | 主键约束                 |
| site_health_status_site_id_fkey | site_id | FOREIGN KEY | 关联 site(id) 并级联删除 |
| site_health_status_status_check | status  | CHECK       | 仅允许 up/slow/down      |

## 表：auth_sessions

### fields

| 字段               | 类型        | 可空 | 默认值            | 字段描述         |
| ------------------ | ----------- | ---- | ----------------- | ---------------- |
| id                 | uuid        | 否   | gen_random_uuid() | 会话主键ID       |
| access_token       | text        | 否   | -                 | 访问令牌         |
| refresh_token      | text        | 否   | -                 | 刷新令牌         |
| token_type         | text        | 否   | bearer            | 令牌类型         |
| access_expires_at  | timestamptz | 否   | -                 | 访问令牌过期时间 |
| session_expires_at | timestamptz | 否   | -                 | 会话过期时间     |
| user_id            | bigint      | 是   | -                 | 用户ID           |
| user_username      | text        | 是   | -                 | 用户名           |
| user_trust_level   | integer     | 是   | -                 | 用户信任等级     |
| user_fetched_at    | timestamptz | 是   | -                 | 用户缓存抓取时间 |
| created_at         | timestamptz | 否   | now()             | 创建时间         |
| updated_at         | timestamptz | 否   | now()             | 更新时间         |

### indexes

| 索引名                               | 字段               | 类型        | 说明             |
| ------------------------------------ | ------------------ | ----------- | ---------------- |
| auth_sessions_pkey                   | id                 | PRIMARY KEY | 主键索引         |
| auth_sessions_session_expires_at_idx | session_expires_at | BTREE       | 会话过期查询索引 |

### constraints

| 约束名             | 字段 | 类型        | 说明     |
| ------------------ | ---- | ----------- | -------- |
| auth_sessions_pkey | id   | PRIMARY KEY | 主键约束 |

## 表：admin_users

### fields

| 字段       | 类型        | 可空 | 默认值            | 字段描述       |
| ---------- | ----------- | ---- | ----------------- | -------------- |
| id         | uuid        | 否   | gen_random_uuid() | 管理员记录主键 |
| user_id    | integer     | 否   | -                 | 管理员用户ID   |
| role       | text        | 否   | admin             | 管理员角色     |
| created_at | timestamptz | 否   | now()             | 创建时间       |

### indexes

| 索引名                  | 字段    | 类型        | 说明               |
| ----------------------- | ------- | ----------- | ------------------ |
| admin_users_pkey        | id      | PRIMARY KEY | 主键索引           |
| admin_users_user_id_key | user_id | UNIQUE      | 管理员用户唯一索引 |

### constraints

| 约束名                  | 字段    | 类型        | 说明                     |
| ----------------------- | ------- | ----------- | ------------------------ |
| admin_users_pkey        | id      | PRIMARY KEY | 主键约束                 |
| admin_users_user_id_key | user_id | UNIQUE      | 用户唯一约束             |
| admin_users_role_check  | role    | CHECK       | 仅允许 admin/super_admin |

## 表：site_reports

### fields

| 字段              | 类型        | 可空 | 默认值            | 字段描述                         |
| ----------------- | ----------- | ---- | ----------------- | -------------------------------- |
| id                | uuid        | 否   | gen_random_uuid() | 报告记录主键                     |
| site_id           | uuid        | 否   | -                 | 被报告站点ID                     |
| reporter_id       | integer     | 否   | -                 | 报告人用户ID                     |
| reporter_username | text        | 否   | ''                | 报告人用户名                     |
| report_type       | text        | 否   | fake_charity      | 报告类型（runaway/fake_charity） |
| reason            | text        | 否   | ''                | 报告原因                         |
| status            | text        | 否   | pending           | 报告状态                         |
| created_at        | timestamptz | 否   | now()             | 创建时间                         |
| reviewed_at       | timestamptz | 是   | -                 | 审核时间                         |
| reviewed_by       | integer     | 是   | -                 | 审核人用户ID                     |

### indexes

| 索引名                          | 字段                            | 类型           | 说明                           |
| ------------------------------- | ------------------------------- | -------------- | ------------------------------ |
| site_reports_pkey               | id                              | PRIMARY KEY    | 主键索引                       |
| idx_site_reports_unique_pending | site_id,reporter_id,report_type | PARTIAL UNIQUE | 同站点同用户同类型仅1条pending |
| idx_site_reports_site_id        | site_id                         | BTREE          | 站点维度查询索引               |
| idx_site_reports_status         | status                          | PARTIAL INDEX  | pending状态查询索引            |

### constraints

| 约束名                         | 字段        | 类型        | 说明                              |
| ------------------------------ | ----------- | ----------- | --------------------------------- |
| site_reports_pkey              | id          | PRIMARY KEY | 主键约束                          |
| site_reports_site_id_fkey      | site_id     | FOREIGN KEY | 关联 site(id) 并级联删除          |
| site_reports_report_type_check | report_type | CHECK       | 仅允许 runaway/fake_charity       |
| site_reports_status_check      | status      | CHECK       | 仅允许 pending/reviewed/dismissed |

## 表：system_settings

### fields

| 字段  | 类型 | 可空 | 默认值 | 字段描述 |
| ----- | ---- | ---- | ------ | -------- |
| key   | text | 否   | -      | 配置键   |
| value | text | 否   | ''     | 配置值   |

### indexes

| 索引名               | 字段 | 类型        | 说明     |
| -------------------- | ---- | ----------- | -------- |
| system_settings_pkey | key  | PRIMARY KEY | 主键索引 |

### constraints

| 约束名               | 字段 | 类型        | 说明     |
| -------------------- | ---- | ----------- | -------- |
| system_settings_pkey | key  | PRIMARY KEY | 主键约束 |
