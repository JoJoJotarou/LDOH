import { redirect } from "next/navigation";
import { Background } from "@/components/common/Background";
import { isAuthRequired, normalizeReturnTo } from "@/lib/auth/ld-oauth";

type LoginPageProps = {
  searchParams?: Promise<{
    returnTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!isAuthRequired()) {
    redirect("/");
  }

  const resolvedParams = (await searchParams) ?? {};
  const returnTo = normalizeReturnTo(resolvedParams.returnTo || "/");

  return (
    <>
      <Background />
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white/90 p-8 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)]">
          <h1 className="text-2xl font-semibold text-neutral-900">登录</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            本站需要通过 LinuxDo OAuth
            才能访问，点击下方按钮后将跳转到授权页面。
          </p>
          <form action="/api/oauth/initiate" method="get" className="mt-6">
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#f5b64c] px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:brightness-105"
            >
              使用 LinuxDo 登录
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
