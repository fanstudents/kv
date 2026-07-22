"use client";

import Avatar from "@/components/agents/Avatar";

/**
 * 會議室裡「像鏡頭前真人」的頭像：待機時緩慢呼吸微晃，偶爾眨眼；
 * 說話中改成更明顯、更快的晃動節奏，跟語音狀態同步。每位用 slug 算出
 * 相位差，一整排人不會同時眨眼／呼吸，看起來不像同一組動畫複製貼上。
 *
 * 照片、眨眼遮罩、鏡頭暗角都放在「同一層」一起做 scale/rotate，跟著一起動——
 * 之前拆成兩層（照片動、遮罩不動）會在呼吸／說話的瞬間讓遮罩跟照片對不齊，
 * 看起來像瑕疵；色環改放在最外層不參與動畫，維持穩定不跳動。
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
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${color}55` }}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-full ${talking ? "cam-talk" : "cam-breathe"}`}
        style={!talking ? { animationDelay: breatheDelay } : undefined}
      >
        <Avatar personEn={personEn} color={color} size={size} ring={false} />
        <div
          className="cam-blink pointer-events-none absolute inset-x-0 top-[32%] h-[20%]"
          style={{ animationDelay: blinkDelay }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 14px 2px rgba(0,0,0,0.35)" }} />
      </div>
    </div>
  );
}
