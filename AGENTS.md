# ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in .agent/PLANS.md) from design to implementation.

**Use Simple Chinese for all documentation.**

# MCP

## Context7

use context7 to retrieve documentation when calling external SDKs or APIs.

# Docs

## Database Schema & Migrations

- Migration scripts must be idempotent and preserve data integrity. Store them in `docs/migrations/`.
  - **NOT update migration history** when making schema changes.

- Keep `docs/db.sql` and `docs/database.md` up to date with the latest schema changes.

- `docs/database.md` must reflect the current schema in Markdown format. **For each table**, provide the following three tables:
  - **Fields** — with columns: 字段, 类型, 可空, 默认值, 字段描述.
  - **Indexes** — with columns: 索引名, 字段, 类型, 说明.
  - **Constraints** — with columns: 约束名, 字段, 类型, 说明.

- `docs/db.sql` must be idempotent and contain the latest schema definition.
  - Column descriptions must be in Chinese and should not be empty.
