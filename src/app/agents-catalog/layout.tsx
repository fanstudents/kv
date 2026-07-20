import Link from "next/link";
import { MessageCircle } from "lucide-react";

// 公開頁面：Agent 目錄，給潛在客戶瀏覽，不掛後台側邊欄、不需要登入。
export default function AgentsCatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C755] text-white">
              <MessageCircle size={16} />
            </span>
            <span className="hidden text-sm font-semibold text-neutral-900 dark:text-white sm:inline">
              TBR AI Studio <span className="font-normal text-neutral-400">· Agent 目錄</span>
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            <Link href="/agents-catalog" className="hidden hover:text-[#06C755] sm:inline">
              總覽
            </Link>
            <Link href="/agents-catalog/general" className="hidden hover:text-[#06C755] sm:inline">
              通用型
            </Link>
            <Link href="/agents-catalog/professional" className="hidden hover:text-[#06C755] sm:inline">
              專業型
            </Link>
            <Link href="/agents-catalog/super" className="hidden hover:text-[#06C755] sm:inline">
              超級 Agent
            </Link>
            <Link
              href="/#cta"
              className="whitespace-nowrap rounded-full bg-[#06C755] px-3.5 py-1.5 text-xs font-medium text-white transition-transform hover:-translate-y-px sm:px-4 sm:text-sm"
            >
              預約部署諮詢
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">{children}</main>
    </div>
  );
}
