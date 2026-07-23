"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import CommandConsole from "@/components/tv/CommandConsole";

// 指揮台獨立頁:從劇場模式抽出來的乾淨操作介面,不疊在片頭/場景動畫上,
// 專心打字 @ 或開口對多位 Agent 下指令。Esc 或左上角箭頭回劇場模式。
export default function CommandConsolePage() {
  const router = useRouter();
  const back = () => router.push("/tv");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-[#05060a] px-4 py-6 text-white sm:px-8">
      <button
        type="button"
        onClick={back}
        className="mb-4 flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-white/60 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft size={15} />
        返回劇場模式
      </button>
      <div className="mx-auto flex w-full max-w-[860px] flex-1">
        <CommandConsole open onOpenChange={back} variant="page" />
      </div>
    </main>
  );
}
