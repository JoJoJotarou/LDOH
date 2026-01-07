/**
 * Filter Bar Component - Enhanced with shadcn/ui
 */

"use client";

import { Tag } from "@/lib/contracts/types/tag";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, EyeOff, Plus, LayoutGrid, List } from "lucide-react";
import { motion } from "framer-motion";

export type ViewMode = "grid" | "list";

interface FilterBarProps {
  tags: Tag[];
  selectedTag: string;
  selectedRegistrationLimit: string;
  selectedFeature: "all" | "ldc" | "translation" | "checkin";
  searchQuery: string;
  showHidden: boolean;
  canCreate: boolean;
  viewMode: ViewMode;
  onTagChange: (tagId: string) => void;
  onRegistrationLimitChange: (value: string) => void;
  onFeatureChange: (value: "all" | "ldc" | "translation" | "checkin") => void;
  onSearchChange: (query: string) => void;
  onToggleShowHidden: () => void;
  onCreate: () => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function FilterBar({
  tags,
  selectedTag,
  selectedRegistrationLimit,
  selectedFeature,
  searchQuery,
  showHidden,
  canCreate,
  viewMode,
  onTagChange,
  onRegistrationLimitChange,
  onFeatureChange,
  onSearchChange,
  onToggleShowHidden,
  onCreate,
  onViewModeChange,
}: FilterBarProps) {
  return (
    <motion.div
      className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* Search Input */}
      <div className="relative w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search sites or API base URL..."
          className="pl-10 pr-24 border-brand-border focus:border-brand-blue focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Badge variant="secondary" className="pointer-events-none h-6 px-2 text-xs font-normal text-brand-muted/80 bg-brand-bg/50 hover:bg-brand-bg/50">
            共 {totalCount} 个
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedTag} onValueChange={onTagChange}>
          <SelectTrigger className="w-[180px] text-xs font-medium border-brand-border focus:ring-brand-blue">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Tags
            </SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag} value={tag} className="text-xs">
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedRegistrationLimit}
          onValueChange={onRegistrationLimitChange}
        >
          <SelectTrigger className="w-[160px] text-xs font-medium border-brand-border focus:ring-brand-blue">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Levels
            </SelectItem>
            <SelectItem value="0" className="text-xs">
              LV0
            </SelectItem>
            <SelectItem value="1" className="text-xs">
              LV1
            </SelectItem>
            <SelectItem value="2" className="text-xs">
              LV2
            </SelectItem>
            <SelectItem value="3" className="text-xs">
              LV3
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedFeature} onValueChange={onFeatureChange}>
          <SelectTrigger className="w-[160px] text-xs font-medium border-brand-border focus:ring-brand-blue">
            <SelectValue placeholder="特性" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Features
            </SelectItem>
            <SelectItem value="ldc" className="text-xs">
              LDC
            </SelectItem>
            <SelectItem value="translation" className="text-xs">
              沉浸式翻译
            </SelectItem>
            <SelectItem value="checkin" className="text-xs">
              签到
            </SelectItem>
          </SelectContent>
        </Select>

        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleShowHidden}
            className="text-xs font-medium"
          >
            {showHidden ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange(viewMode === "grid" ? "list" : "grid")}
            className="text-xs font-medium"
            title={viewMode === "grid" ? "切换为列表视图" : "切换为卡片视图"}
          >
            {viewMode === "grid" ? (
              <List className="h-3.5 w-3.5" />
            ) : (
              <LayoutGrid className="h-3.5 w-3.5" />
            )}
          </Button>
        </motion.div>
        {canCreate && (
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={onCreate}
              className="text-xs font-medium"
              title="新增站点"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
