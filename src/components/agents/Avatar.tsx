import { avatarUrl } from "@/lib/agent-data";

export default function Avatar({
  personEn,
  color,
  size = 48,
  ring = true,
}: {
  personEn: string;
  color: string;
  size?: number;
  /** 設 false 可拿掉色環（例如外層自己疊了一圈、或這張圖會被裁切容器包住，色環在那裡會被切掉）。 */
  ring?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl(personEn, color)}
      alt={personEn}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${ring ? "ring-2" : ""}`}
      style={{ width: size, height: size, ["--tw-ring-color" as string]: `${color}55` }}
    />
  );
}
