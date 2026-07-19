"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, MessageCircle, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "登入失敗");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "登入失敗");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* 背景：辦公室實景模糊 + 深色漸層罩 */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url(/office-bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B2E1A]/90 via-[#0f2a20]/85 to-[#06120c]/95" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(6,199,85,0.4) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* 登入卡片 */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06C755] shadow-lg shadow-[#06C755]/30">
            <MessageCircle size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white">原騰數位科技</h1>
          <p className="mt-1 text-sm text-[#9ED8B8]">AI Agent 控制台 · 請登入以繼續</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl"
        >
          <label className="mb-2 block text-xs font-medium text-[#C7E9D6]">管理密碼</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8FCFAE]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="請輸入密碼"
              className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-[#06C755] focus:bg-white/15 focus:ring-2 focus:ring-[#06C755]/30"
            />
          </div>

          {state === "error" && <p className="mt-2 text-xs text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={state === "loading" || !password}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#06C755] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {state === "loading" ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {state === "loading" ? "登入中…" : "登入"}
          </button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/40">
          <Lock size={11} /> 本後台受密碼保護，僅供授權人員存取
        </p>
      </div>
    </div>
  );
}
