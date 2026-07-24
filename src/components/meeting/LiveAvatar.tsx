"use client";

import Avatar from "@/components/agents/Avatar";

/**
 * 會議室裡的頭像：維持鏡頭感的暗角與色環，但不再有呼吸／眨眼／說話晃動——
 * 純靜態照片，跟其他頁面的 Avatar 呈現方式一致。
 */
export default function LiveAvatar({
  personEn,
  color,
  size,
}: {
  personEn: string;
  color: string;
  size: number;
}) {
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${color}55` }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full">
        <Avatar personEn={personEn} color={color} size={size} ring={false} />
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 14px 2px rgba(0,0,0,0.35)" }} />
      </div>
    </div>
  );
}
