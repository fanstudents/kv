#!/usr/bin/env node
// 重新生成 Agent 的形象照（虛構人物，不存在於現實）到 public/avatars/。
//
// 用法：
//   node scripts/generate-avatars.mjs vivian          # 只做一位（先看風格）
//   node scripts/generate-avatars.mjs vivian kevin    # 做指定幾位
//   node scripts/generate-avatars.mjs --all           # 全部 12 位
//   node scripts/generate-avatars.mjs --all --variant # 連 -2 備用版一起做
//
// 會直接覆蓋 public/avatars/*.jpg。這些檔案有進 git，做壞了用
//   git checkout -- public/avatars/
// 就能還原。
//
// 費用：走 OPENAI_API_KEY，每張圖都要錢（gpt-image-2，high quality）。
// 先跑一位確認風格再跑全部，不要一次燒 12 張才發現方向不對。

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/avatars");

// .env.local 只有 KEY=VALUE，不需要額外套件
function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const env = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("OPENAI_API_KEY="));
  if (!line) throw new Error("找不到 OPENAI_API_KEY（環境變數與 .env.local 都沒有）");
  return line.slice("OPENAI_API_KEY=".length).trim();
}

// 全隊共用的拍攝設定：換人只換長相與氣質，光線／背景／構圖／服裝色系都一樣，
// 十二張並排時才像同一天、同一位攝影師、同一間棚拍出來的一組團隊照。
const STYLE = [
  "Professional corporate headshot photograph of a completely fictional person (not a real individual).",
  "Taiwanese, East Asian features, natural and photorealistic.",
  "Shot on 85mm lens at f/2.0, soft large-softbox key light from front-left with gentle fill, clean catchlights in the eyes.",
  "Seamless warm light-grey studio backdrop with a subtle vignette.",
  "Head and shoulders, centered, facing camera, sharp focus on the eyes, shallow depth of field.",
  "Modern smart-casual business attire in muted neutral tones.",
  "Natural healthy skin texture with visible pores — not airbrushed, not plastic, not CGI, no beauty filter.",
  "Bright, warm, approachable, photogenic and good-looking; confident and friendly presence.",
  "No text, no watermark, no logo, no props, no glasses glare.",
].join(" ");

// 每位的長相與氣質。年齡整體調年輕、外型往「賞心悅目」走，
// 但保留原本的性別與職務氣質，換頭像不會讓人認不出是誰。
const AGENTS = {
  vivian: "A poised, elegant Taiwanese woman in her early 30s. Team leader presence: calm, warm authority. Sleek shoulder-length black hair, refined features, a composed and reassuring closed-lip smile. Wearing a well-tailored charcoal blazer over a cream top.",
  kevin: "A sharp, alert Taiwanese man in his late 20s. Monitoring specialist: quick, attentive, energetic. Neat short black hair, clean-cut handsome features, defined jawline, a bright and friendly smile. Wearing a slate-blue button-down shirt.",
  ivy: "A bright, intelligent Taiwanese woman in her late 20s. Data analyst: thoughtful and articulate. Long straight black hair tucked behind one ear, delicate refined features, an intelligent warm smile. Wearing a soft grey knit top under a light blazer.",
  milo: "A friendly, easygoing Taiwanese man in his late 20s. Scheduling assistant: organized and pleasant. Soft textured black hair, gentle good-looking features, warm open smile. Wearing a light beige casual shirt.",
  sunny: "A vibrant, charming Taiwanese woman in her mid 20s. Social media manager: expressive and stylish. Long wavy dark-brown hair, radiant photogenic features, a lively genuine smile showing teeth. Wearing a soft dusty-pink blouse.",
  leo: "A focused, refined Taiwanese man in his early 30s. SEO specialist: analytical and precise. Neatly combed black hair, handsome angular features, a subtle confident closed-lip smile. Wearing a dark green fine-knit sweater over a collared shirt.",
  coco: "A warm, personable Taiwanese woman in her late 20s. Business development: approachable and persuasive. Chin-length bob with soft layers, pretty expressive features, a bright welcoming smile. Wearing a light camel blazer over a white top.",
  dana: "A confident, striking Taiwanese woman in her early 30s. Advertising strategist: decisive and modern. Long straight dark hair with subtle highlights, elegant strong features, a self-assured slight smile. Wearing a structured black blazer.",
  jay: "A perceptive, composed Taiwanese man in his late 20s. Sentiment analyst: observant and thoughtful. Slightly tousled black hair, attractive clean features, a calm knowing half-smile. Wearing a muted purple-grey shirt.",
  morgan: "A capable, distinguished Taiwanese man in his late 30s. Operations director: steady, experienced, trustworthy. Well-groomed black hair with a hint of grey at the temples, handsome mature features, a measured confident smile. Wearing a navy blazer over a light blue shirt.",
  amber: "A gentle, welcoming Taiwanese woman in her mid 20s. Customer service: patient and kind. Soft shoulder-length black hair, sweet approachable features, a warm reassuring smile. Wearing a soft rose-beige blouse.",
  ray: "A dependable, upbeat Taiwanese man in his mid 20s. Order desk: attentive and efficient. Short tidy black hair, fresh good-looking features, a friendly energetic smile. Wearing a warm amber-toned casual shirt.",
};

async function generate(name, variant) {
  const persona = AGENTS[name];
  if (!persona) throw new Error(`未知的 Agent：${name}（可用：${Object.keys(AGENTS).join(", ")}）`);

  // -2 是備用版：同一個人、換一個表情與角度，不是換一個人
  const angle = variant
    ? " Slightly different pose: head turned a few degrees, a softer and more relaxed expression."
    : "";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${loadKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: `${persona}${angle} ${STYLE}`,
      size: "1024x1536", // 跟現有檔案同比例（2:3 直式）
      quality: "high",
      n: 1,
    }),
  });

  if (!res.ok) throw new Error(`生成失敗（${res.status}）：${await res.text()}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`回應裡沒有影像資料：${JSON.stringify(data).slice(0, 300)}`);

  const file = resolve(OUT_DIR, `${name}${variant ? "-2" : ""}.jpg`);
  writeFileSync(file, Buffer.from(b64, "base64"));
  return file;
}

const args = process.argv.slice(2);
const withVariant = args.includes("--variant");
const names = args.includes("--all")
  ? Object.keys(AGENTS)
  : args.filter((a) => !a.startsWith("--"));

if (names.length === 0) {
  console.error("請指定要生成的 Agent，或用 --all。可用：" + Object.keys(AGENTS).join(", "));
  process.exit(1);
}

const jobs = names.flatMap((n) => (withVariant ? [[n, false], [n, true]] : [[n, false]]));
console.log(`準備生成 ${jobs.length} 張（gpt-image-2 / high / 1024x1536）…\n`);

for (const [name, variant] of jobs) {
  process.stdout.write(`  ${name}${variant ? "-2" : ""} … `);
  try {
    const file = await generate(name, variant);
    console.log(`✓ ${file.replace(ROOT + "/", "")}`);
  } catch (err) {
    console.log(`✗ ${err.message}`);
  }
}
