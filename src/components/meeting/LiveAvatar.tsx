"use client";

import Avatar from "@/components/agents/Avatar";

/**
 * 會議室裡「像鏡頭前真人」的頭像：待機時緩慢呼吸微晃，偶爾眨眼；
 * 說話中改成更明顯、更快的晃動節奏，跟語音狀態同步。每位用 slug 算出
 * 相位差，一整排人不會同時眨眼／呼吸，看起來不像同一組動畫複製貼上。
 */
export default function LiveAvatar({
  personEn,
  color,
  size,
  slug,
  talking = false,
}: {
  personEn: string;
  color: string;
  size: number;
  slug: string;
  talking?: boolean;
}) {
  const h = Array.from(slug).reduce((a, c) => a + c.charCodeAt(0), 0);
  const breatheDelay = `${(h % 30) / 10}s`;
  const blinkDelay = `${(h % 47) / 10}s`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={talking ? "cam-talk" : "cam-breathe"} style={!talking ? { animationDelay: breatheDelay } : undefined}>
        <Avatar personEn={personEn} color={color} size={size} />
      </div>
      {/* 眨眼與鏡頭暗角只影響這層，不會跟著把外圍的色環一起裁掉 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <div
          className="cam-blink absolute inset-x-0 top-[34%] h-[14%]"
          style={{ background: "rgba(5,6,10,0.55)", animationDelay: blinkDelay }}
        />
        <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 14px 2px rgba(0,0,0,0.35)" }} />
      </div>
    </div>
  );
}
