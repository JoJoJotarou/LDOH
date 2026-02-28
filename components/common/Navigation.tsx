/**
 * Navigation Component - Enhanced with shadcn/ui
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,} from "@/components/ui/tooltip";
import {Github, Heart, Moon, Sun} from "lucide-react";
import {useTheme} from "@/components/common/ThemeProvider";

type NavigationProps = {
  username?: string;
};

export function Navigation({ username }: NavigationProps) {
  const {theme, toggleTheme} = useTheme();

  return (
      <nav
          className="sticky top-0 z-40 w-full border-b border-brand-border bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:bg-background/70 dark:supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-md">
              <Image
                src="/logo.svg"
                alt="LD OPEN HUB Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-lg font-semibold tracking-tight dark:text-foreground">
              LD OPEN HUB
            </span>
          </div>
          <Badge
            variant="secondary"
            className="bg-brand-green/10 text-brand-green hover:bg-brand-green/20"
          >
            <span className="inline-flex items-center gap-1.5">
              Love And Share
              <Heart className="h-3.5 w-3.5 animate-pulse" />
            </span>
          </Badge>
          <div
              className="hidden items-center gap-2 text-sm font-medium text-brand-muted sm:flex dark:text-muted-foreground">
            <Link
              href="/"
              className="rounded-full px-3 py-1 transition hover:text-brand-text"
            >
              公益站
            </Link>
            <span className="h-3.5 w-px bg-brand-border/80" aria-hidden="true" />
            <Link
              href="/runaway-sites"
              className="rounded-full px-3 py-1 transition hover:text-brand-text"
            >
              公益站（跑路）
            </Link>
            <span className="h-3.5 w-px bg-brand-border/80" aria-hidden="true" />
            <Link
              href="/open-projects"
              className="rounded-full px-3 py-1 transition hover:text-brand-text"
            >
              开源项目
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {username && (
              <span
                  className="rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-medium text-brand-muted dark:bg-card dark:text-muted-foreground">
              Hi, {username}
            </span>
          )}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild aria-label="ALL API Hub">
                  <a
                    href="https://linux.do/t/topic/1001042"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://github.com/qixing-jk/all-api-hub/raw/main/assets/icon.png"
                      alt="ALL API Hub"
                      className="h-4 w-4 rounded-sm object-contain"
                    />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                <p className="font-semibold">ALL API Hub</p>
                <p className="text-xs text-muted-foreground mt-0.5">@qi_xing_jk</p>
                <p className="text-xs text-muted-foreground mt-0.5">一站式管理此网站内的网站账号：余额/用量看板、自动签到、密钥一键导出到常用应用、网页内 API 可用性测试、渠道与模型同步/重定向</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild aria-label="LDOH New API Helper">
                  <a
                    href="https://greasyfork.org/zh-CN/scripts/565844-ldoh-new-api-helper"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://www.tampermonkey.net/favicon.ico"
                      alt="LDOH New API Helper"
                      className="h-4 w-4 object-contain dark:invert dark:brightness-90"
                    />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                <p className="font-semibold">LDOH New API Helper</p>
                <p className="text-xs text-muted-foreground mt-0.5">@LDOH</p>
                <p className="text-xs text-muted-foreground mt-0.5">LDOH New API 专属小助手，支持余额查询、自动签到、密钥管理、模型查询</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="ghost" size="icon" asChild aria-label="GitHub">
            <a
              href="https://github.com/JoJoJotarou/LDOH"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
                >
                  {theme === "dark" ? (
                      <Sun className="h-4 w-4"/>
                  ) : (
                      <Moon className="h-4 w-4"/>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </nav>
  );
}
