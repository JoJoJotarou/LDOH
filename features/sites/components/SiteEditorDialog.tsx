/**
 * Site Editor Dialog
 * 站点新增/编辑弹窗
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag } from "@/lib/contracts/types/tag";
import { Site } from "@/lib/contracts/types/site";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  X,
  Plus,
  Trash2,
  Info,
  Settings,
  Users,
  Link as LinkIcon,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MaintainerForm = {
  name: string;
  profileUrl: string;
  username?: string;
};

type ExtensionForm = {
  label: string;
  url: string;
};

type SiteFormData = {
  name: string;
  description: string;
  registrationLimit: number;
  apiBaseUrl: string;
  tags: string[];
  supportsImmersiveTranslation: boolean;
  supportsLdc: boolean;
  supportsCheckin: boolean;
  supportsNsfw: boolean;
  checkinUrl: string;
  checkinNote: string;
  benefitUrl: string;
  rateLimit: string;
  statusUrl: string;
  maintainers: MaintainerForm[];
  extensionLinks: ExtensionForm[];
  isVisible: boolean;
};

type SiteEditorDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  site?: Site | null;
  tags: Tag[];
  canEditVisibility: boolean;
  onClose: () => void;
  onSubmit: (payload: SiteFormData) => Promise<void>;
};

const emptyForm: SiteFormData = {
  name: "",
  description: "",
  registrationLimit: 2,
  apiBaseUrl: "",
  tags: [],
  supportsImmersiveTranslation: false,
  supportsLdc: false,
  supportsCheckin: false,
  supportsNsfw: false,
  checkinUrl: "",
  checkinNote: "",
  benefitUrl: "",
  rateLimit: "",
  statusUrl: "",
  maintainers: [{ name: "", profileUrl: "", username: "" }],
  extensionLinks: [],
  isVisible: true,
};

type TabType = "basic" | "features" | "maintainers";

export function SiteEditorDialog({
  open,
  mode,
  site,
  tags,
  canEditVisibility,
  onClose,
  onSubmit,
}: SiteEditorDialogProps) {
  const [form, setForm] = useState<SiteFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [tagInput, setTagInput] = useState("");

  const parseLinuxDoId = (value?: string) => {
    if (!value) return "";
    const match = value.match(/linux\.do\/u\/([^/]+)\/summary/i);
    return match ? match[1] : value;
  };
  const buildLinuxDoProfileUrl = (linuxDoId: string) =>
    linuxDoId ? `https://linux.do/u/${linuxDoId}/summary` : "";


  useEffect(() => {
    if (!open) return;
    setActiveTab("basic");
    if (mode === "edit" && site) {
      setForm({
        name: site.name || "",
        description: site.description || "",
        registrationLimit: site.registrationLimit ?? 2,
        apiBaseUrl: site.apiBaseUrl || "",
        tags: site.tags || [],
        supportsImmersiveTranslation: Boolean(
          site.supportsImmersiveTranslation
        ),
        supportsLdc: Boolean(site.supportsLdc),
        supportsCheckin: Boolean(site.supportsCheckin),
        supportsNsfw: Boolean(site.supportsNsfw),
        checkinUrl: site.checkinUrl || "",
        checkinNote: site.checkinNote || "",
        benefitUrl: site.benefitUrl || "",
        rateLimit: site.rateLimit || "",
        statusUrl: site.statusUrl || "",
        maintainers: site.maintainers?.map((maintainer) => ({
          name: maintainer.name || "",
          profileUrl: maintainer.profileUrl || "",
          username:
            maintainer.username ||
            (maintainer.profileUrl?.match(/linux\.do\/u\/([^/]+)\/summary/i)?.[1] ||
              ""),
        })) || [{ name: "", profileUrl: "", username: "" }],
        extensionLinks:
          site.extensionLinks?.map((link) => ({
            label: link.label || "",
            url: link.url || "",
          })) || [],
        isVisible: site.isVisible !== false,
      });
      setError(null);
      setTagInput("");
      return;
    }
    setForm(emptyForm);
    setError(null);
    setTagInput("");
  }, [open, mode, site]);

  const selectedTags = useMemo(() => new Set(form.tags), [form.tags]);
  const tagOptions = useMemo(() => {
    const presets = ["Claude Code", "Codex", "Gemini CLI"];
    const map = new Map<string, string>();
    for (const preset of presets) {
      map.set(preset.toLowerCase(), preset);
    }
    for (const tag of tags) {
      map.set(tag.toLowerCase(), tag);
    }
    return Array.from(map.values());
  }, [tags]);

  const handleAddTag = (inputVal: string) => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    const normalized = tagOptions.find(
      (tag) => tag.toLowerCase() === trimmed.toLowerCase()
    );
    const tagToAdd = normalized ?? trimmed;

    if (!form.tags.includes(tagToAdd)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tagToAdd] }));
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagId),
    }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && form.tags.length > 0) {
      // Allow deleting the last tag with backspace if input is empty
      handleRemoveTag(form.tags[form.tags.length - 1]);
    }
  };

  const handleMaintainerChange = (
    index: number,
    key: keyof MaintainerForm,
    value: string
  ) => {
    setForm((prev) => {
      const next = [...prev.maintainers];
      const nextItem = { ...next[index], [key]: value };
      if (key === "profileUrl") {
        const parsedId = parseLinuxDoId(value);
        if (parsedId && !nextItem.name.trim()) {
          nextItem.name = parsedId;
        }
        nextItem.username = parsedId;
      }
      next[index] = nextItem;
      return { ...prev, maintainers: next };
    });
  };

  const handleExtensionChange = (
    index: number,
    key: keyof ExtensionForm,
    value: string
  ) => {
    setForm((prev) => {
      const next = [...prev.extensionLinks];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, extensionLinks: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const normalizedMaintainers = form.maintainers.map((maintainer) => {
        const rawUrl = maintainer.profileUrl.trim();
        const parsedId = parseLinuxDoId(rawUrl);
        const resolvedUrl = rawUrl.includes("linux.do/u/")
          ? rawUrl
          : buildLinuxDoProfileUrl(parsedId);
        return {
          name: maintainer.name.trim() || parsedId,
          id: parsedId,
          profileUrl: resolvedUrl,
          username: maintainer.username || parsedId,
        };
      });
      const validMaintainers = normalizedMaintainers.filter(
        (maintainer) => maintainer.name || maintainer.profileUrl
      );
      if (validMaintainers.length === 0) {
        setError("至少添加一位维护者（站长）");
        return;
      }
      await onSubmit({ ...form, maintainers: validMaintainers });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失败";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="relative flex w-full max-w-4xl max-h-[90vh] flex-col rounded-xl border border-brand-border bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-border/50 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-brand-text">
                  {mode === "create" ? "新增站点" : "编辑站点"}
                </h2>
                <p className="mt-0.5 text-xs text-brand-muted">
                  帮助完善站点信息，带 * 为必填项
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-brand-border/50 px-6">
              <TabButton
                active={activeTab === "basic"}
                onClick={() => setActiveTab("basic")}
                icon={<Info className="h-4 w-4" />}
                label="基础信息"
              />
              <TabButton
                active={activeTab === "features"}
                onClick={() => setActiveTab("features")}
                icon={<Settings className="h-4 w-4" />}
                label="功能配置"
              />
              <TabButton
                active={activeTab === "maintainers"}
                onClick={() => setActiveTab("maintainers")}
                icon={<Users className="h-4 w-4" />}
                label="维护与扩展"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-[450px] p-6 custom-scrollbar">
              {activeTab === "basic" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                        站点名称 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="例如：My AI Service"
                        className="mt-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                        API Base URL <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={form.apiBaseUrl}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            apiBaseUrl: e.target.value,
                          }))
                        }
                        placeholder="https://api.example.com"
                        className="mt-2 rounded-lg font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                      站点描述
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="简要介绍站点的特色..."
                      className="mt-2 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue/20 min-h-[80px]"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                        等级限制 (LV)
                      </label>
                      <Input
                        value={String(form.registrationLimit)}
                        type="number"
                        min="0"
                        max="3"
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 0 && val <= 3) {
                            setForm((prev) => ({
                              ...prev,
                              registrationLimit: val,
                            }));
                          }
                        }}
                        placeholder="0-3"
                        className="mt-2 rounded-lg"
                      />
                      <p className="mt-1 text-[10px] text-brand-muted/70">
                        等级限制范围为 0-3，用户等级需达到此级别才能查看
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                        速率限制
                      </label>
                      <Input
                        value={form.rateLimit}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rateLimit: e.target.value,
                          }))
                        }
                        placeholder="例如: 10/min, 100/day"
                        className="mt-2 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                      Tags (支持的模型/功能)
                    </label>

                    {/* Input Area with Selected Tags */}
                    <div className="mt-2 min-h-[42px] flex flex-wrap gap-2 rounded-lg border border-brand-border bg-white p-2 focus-within:ring-1 focus-within:ring-brand-blue/20 focus-within:border-brand-blue transition-all">
                      <AnimatePresence mode="popLayout">
                        {form.tags.map((tagId) => (
                          <motion.div
                            key={tagId}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            layout
                          >
                            <Badge
                              variant="secondary"
                              className="gap-1 pr-1 pl-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                            >
                              {tagId}
                              <button
                                onClick={() => handleRemoveTag(tagId)}
                                className="ml-1 rounded-full p-0.5 hover:bg-slate-300/50 text-slate-500 transition-colors focus:outline-none"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <input
                        className="flex-1 min-w-[120px] bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
                        placeholder={
                          form.tags.length === 0
                            ? "输入标签并回车添加..."
                            : "添加更多..."
                        }
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                      />
                    </div>

                    {/* Recommended Tags */}
                    <div className="mt-3">
                      <p className="text-[10px] text-brand-muted mb-2 font-medium">
                        推荐标签 (点击添加):
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
                        {tagOptions
                          .filter((tag) => !selectedTags.has(tag))
                          .map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="cursor-pointer hover:bg-brand-blue/5 hover:border-brand-blue/30 hover:text-brand-blue transition-colors py-1 px-2.5 font-normal text-slate-600 bg-white"
                              onClick={() => handleAddTag(tag)}
                            >
                              <Plus className="mr-1 h-3 w-3 opacity-50" />
                              {tag}
                            </Badge>
                          ))}
                        {tagOptions.every((tag) => selectedTags.has(tag)) && (
                          <span className="text-[10px] text-brand-muted/50 italic">
                            已全部选择
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "features" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-brand-text flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      功能开关
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <ToggleCard
                        checked={form.supportsCheckin}
                        onChange={(c) =>
                          setForm((p) => ({ ...p, supportsCheckin: c }))
                        }
                        title="支持签到"
                        description="是否支持每日签到"
                      />
                      <ToggleCard
                        checked={form.supportsImmersiveTranslation}
                        onChange={(c) =>
                          setForm((p) => ({
                            ...p,
                            supportsImmersiveTranslation: c,
                          }))
                        }
                        title="支持沉浸式翻译"
                        description="是否可用于沉浸式翻译插件"
                      />
                      <ToggleCard
                        checked={form.supportsLdc}
                        onChange={(c) =>
                          setForm((p) => ({ ...p, supportsLdc: c }))
                        }
                        title="支持 LDC"
                        description="是否支持 Linux Do Credit"
                      />
                      <ToggleCard
                        checked={form.supportsNsfw}
                        onChange={(c) =>
                          setForm((p) => ({ ...p, supportsNsfw: c }))
                        }
                        title="支持 NSFW"
                        description="是否支持 NSFW"
                      />
                      {mode === "edit" && canEditVisibility && (
                        <ToggleCard
                          checked={!form.isVisible}
                          onChange={(c) =>
                            setForm((p) => ({ ...p, isVisible: !c }))
                          }
                          title="隐藏站点"
                          description="在列表中隐藏此站点 (仅维护者可见)"
                          variant="danger"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-brand-text flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      相关链接
                    </h3>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-brand-muted">
                            签到页 URL
                          </label>
                          <Input
                            value={form.checkinUrl}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                checkinUrl: e.target.value,
                              }))
                            }
                            placeholder="默认 APIBaseUrl + /console/personal"
                            className="mt-1.5 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-brand-muted">
                            签到说明
                          </label>
                          <Input
                            value={form.checkinNote}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                checkinNote: e.target.value,
                              }))
                            }
                            placeholder="例如：每日签到送 10 刀"
                            className="mt-1.5 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-brand-muted">
                            福利站 URL
                          </label>
                          <Input
                            value={form.benefitUrl}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                benefitUrl: e.target.value,
                              }))
                            }
                            placeholder="https://..."
                            className="mt-1.5 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-brand-muted">
                            状态页 URL
                          </label>
                          <Input
                            value={form.statusUrl}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                statusUrl: e.target.value,
                              }))
                            }
                            placeholder="https://status..."
                            className="mt-1.5 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "maintainers" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-brand-text">
                          维护者信息
                        </h3>
                        {/* <p className="text-[11px] text-brand-muted">
                          填写 Linux Do 个人资料链接将自动提取 ID 与头像
                        </p> */}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-lg"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            maintainers: [
                              ...prev.maintainers,
                              { name: "", profileUrl: "", username: "" },
                            ],
                          }))
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        添加维护者
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {form.maintainers.map((maintainer, index) => (
                        <motion.div
                          key={`maintainer-${index}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group relative flex flex-col sm:flex-row gap-3 rounded-lg border border-brand-border/60 bg-slate-50/50 p-3 items-start sm:items-center transition-all hover:bg-white hover:shadow-sm hover:border-brand-border"
                        >
                          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                <LinkIcon className="h-3.5 w-3.5" />
                              </div>
                              <Input
                                value={maintainer.profileUrl}
                                onChange={(e) =>
                                  handleMaintainerChange(
                                    index,
                                    "profileUrl",
                                    e.target.value
                                  )
                                }
                                placeholder="LD 个人主页：https://linux.do/u/xxx/summary"
                                className="h-9 bg-white text-xs rounded-md pl-9"
                              />
                            </div>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                <Users className="h-3.5 w-3.5" />
                              </div>
                              <Input
                                value={maintainer.name}
                                onChange={(e) =>
                                  handleMaintainerChange(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="显示名称"
                                className="h-9 bg-white text-xs rounded-md pl-9"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end sm:justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  maintainers: prev.maintainers.filter(
                                    (_, idx) => idx !== index
                                  ),
                                }))
                              }
                              disabled={form.maintainers.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-brand-text">
                        更多扩展链接
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-lg"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            extensionLinks: [
                              ...prev.extensionLinks,
                              { label: "", url: "" },
                            ],
                          }))
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        添加链接
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {form.extensionLinks.length === 0 && (
                        <div className="rounded-lg border border-dashed border-brand-border/60 p-6 text-center text-xs text-brand-muted">
                          暂无扩展链接，点击上方按钮添加
                        </div>
                      )}
                      {form.extensionLinks.map((link, index) => (
                        <motion.div
                          key={`link-${index}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group relative flex flex-col sm:flex-row gap-3 rounded-lg border border-brand-border/60 bg-slate-50/50 p-3 items-start sm:items-center transition-all hover:bg-white hover:shadow-sm hover:border-brand-border"
                        >
                          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                              <Input
                                value={link.label}
                                onChange={(e) =>
                                  handleExtensionChange(
                                    index,
                                    "label",
                                    e.target.value
                                  )
                                }
                                placeholder="链接名称"
                                className="h-9 bg-white text-xs rounded-md"
                              />
                            </div>
                            <div className="sm:col-span-2 relative">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                <LinkIcon className="h-3.5 w-3.5" />
                              </div>
                              <Input
                                value={link.url}
                                onChange={(e) =>
                                  handleExtensionChange(
                                    index,
                                    "url",
                                    e.target.value
                                  )
                                }
                                placeholder="https://..."
                                className="h-9 bg-white text-xs rounded-md pl-9"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end sm:justify-center shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  extensionLinks: prev.extensionLinks.filter(
                                    (_, idx) => idx !== index
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-brand-border/50 bg-gray-50/50 px-6 py-4 rounded-b-xl">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={saving}
                  className="bg-white rounded-lg"
                >
                  取消
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="min-w-[80px] rounded-lg"
                >
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors outline-none",
        active
          ? "border-brand-blue text-brand-blue"
          : "border-transparent text-brand-muted hover:text-brand-text"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleCard({
  checked,
  onChange,
  title,
  description,
  variant = "default",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
  variant?: "default" | "danger" | "warning-amber";
}) {
  return (
    <div
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-md active:scale-[0.98]",
        checked
          ? variant === "danger"
            ? "border-red-200 bg-red-50/50"
            : variant === "warning-amber"
            ? "border-amber-200 bg-amber-50/50"
            : "border-brand-blue/30 bg-brand-blue/5"
          : "border-brand-border bg-white"
      )}
      onClick={() => onChange(!checked)}
    >
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? variant === "danger"
              ? "border-red-500 bg-red-500 text-white"
              : variant === "warning-amber"
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-brand-blue bg-brand-blue text-white"
            : "border-slate-300 bg-white"
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </div>
      <div>
        <h4
          className={cn(
            "text-sm font-medium",
            variant === "danger" && checked ? "text-red-700" : variant === "warning-amber" && checked ? "text-amber-700" : "text-brand-text"
          )}
        >
          {title}
        </h4>
        <p className="text-[11px] text-brand-muted leading-tight mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}
