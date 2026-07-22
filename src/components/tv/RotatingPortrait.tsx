"use client";

import { useEffect, useState } from "react";

// 劇場模式的人像會放到很大，長時間停在同一張靜態照片會顯得死板。
// 這裡在同一位 Agent 已經準備好的幾張不同表情照之間淡入淡出輪播，
// 讓畫面有呼吸感——是換照片，不是真的做臉部動畫，成本低也不會出戲。
export default function RotatingPortrait({
  frames,
  alt,
  className,
  intervalMs = 7000,
}: {
  frames: string[];
  alt: string;
  /** 套用在每一張圖上的樣式（絕對定位由本元件負責，這裡只需給 h-full w-full object-cover 之類的） */
  className?: string;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (frames.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % frames.length), intervalMs);
    return () => clearInterval(timer);
  }, [frames.length, intervalMs]);

  return (
    <>
      {frames.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={i === 0 ? alt : ""}
          aria-hidden={i === 0 ? undefined : true}
          className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${className ?? ""}`}
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </>
  );
}
