import Sidebar from "@/components/layout/Sidebar";
import AgentChatWidget from "@/components/chat/AgentChatWidget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</div>
      </main>
      <AgentChatWidget />
    </div>
  );
}
