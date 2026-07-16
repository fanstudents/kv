import { ChevronLeft, Search, FileText, Menu } from "lucide-react";

export default function PhoneFrame({
  accountName = "官方帳號",
  children,
}: {
  accountName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[2rem] border-4 border-neutral-900 bg-neutral-900 shadow-xl">
      <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[11px] font-medium text-white">
        <span>1:18</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-white/70" />
          <span className="h-2 w-3 rounded-sm bg-white/70" />
        </span>
      </div>
      <div className="flex items-center justify-between bg-neutral-900 px-3 pb-2 text-white">
        <ChevronLeft size={18} />
        <span className="text-sm font-medium">{accountName}</span>
        <div className="flex items-center gap-3 text-white/80">
          <Search size={15} />
          <FileText size={15} />
          <Menu size={15} />
        </div>
      </div>
      <div className="max-h-[420px] min-h-[320px] space-y-3 overflow-y-auto bg-[#8fbef7] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:14px_14px] px-3 py-3">
        {children}
      </div>
    </div>
  );
}
