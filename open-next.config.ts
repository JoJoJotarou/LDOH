import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 当前项目先使用默认 dummy 缓存，部署到 Cloudflare 时不强制要求额外的 KV/R2/D1 绑定。
export default defineCloudflareConfig();
