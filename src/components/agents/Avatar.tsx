import { avatarUrl } from "@/lib/agent-data";

export default function Avatar({
  personEn,
  color,
  size = 48,
}: {
  personEn: string;
  color: string;
  size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl(personEn, color)}
      alt={personEn}
      width={size}
      height={size}
      className="shrink-0 rounded-full ring-2"
      style={{ width: size, height: size, ["--tw-ring-color" as string]: `${color}55` }}
    />
  );
}
