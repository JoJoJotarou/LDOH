/**
 * Navigation Component - Enhanced with shadcn/ui
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, Heart } from "lucide-react";

type NavigationProps = {
  username?: string;
};

export function Navigation({ username }: NavigationProps) {
  const repoUrl = process.env.NEXT_PUBLIC_REPO_URL;

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-brand-border bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-blue text-white font-bold">
              L
            </div>
            <span className="text-lg font-semibold tracking-tight">
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
          <div className="hidden items-center gap-2 text-sm font-medium text-brand-muted sm:flex">
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
        <div className="flex items-center gap-2">
          {username && (
            <span className="rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-medium text-brand-muted">
              Hi, {username}
            </span>
          )}
          <Button variant="ghost" size="icon" asChild aria-label="GitHub">
            <a
              href="https://github.com/JoJoJotarou/LDOH"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          {repoUrl && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-sm font-medium"
            >
              <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
