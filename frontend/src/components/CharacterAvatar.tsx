import { useEffect, useMemo, useState } from "react";

const palettes = [
  "from-amber-200 via-orange-100 to-rose-100",
  "from-emerald-200 via-lime-100 to-yellow-100",
  "from-sky-200 via-cyan-100 to-indigo-100",
  "from-rose-200 via-pink-100 to-orange-100",
  "from-fuchsia-200 via-violet-100 to-blue-100",
  "from-teal-200 via-emerald-100 to-lime-100",
];

const fallbackImageMap: Record<string, string> = {
  אבא: "/characters/dad.png",
  אמא: "/characters/mom.png",
  דוד: "/characters/uncle.png",
  דודה: "/characters/aunt.png",
  סבא: "/characters/grandpa.png",
  סבתא: "/characters/grandma.png",
  ילד: "/characters/boy.png",
  ילדה: "/characters/girl.png",
  כלב: "/characters/dog.png",
  חתול: "/characters/cat.png",
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("") || "?";
}

function paletteFromName(name: string): string {
  const hash = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

export function CharacterAvatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => initialsFromName(name), [name]);
  const palette = useMemo(() => paletteFromName(name), [name]);
  const resolvedImageUrl = imageUrl?.trim() || fallbackImageMap[name];

  useEffect(() => {
    setFailed(false);
  }, [resolvedImageUrl]);

  const sizeClass =
    size === "sm"
      ? "h-12 w-12 text-sm"
      : size === "lg"
        ? "h-20 w-20 text-2xl"
        : "h-14 w-14 text-base";

  if (resolvedImageUrl && !failed) {
    return (
      <div className={`${sizeClass} overflow-hidden rounded-[1.2rem] border border-white/80 bg-white shadow-md`}>
        <img
          src={resolvedImageUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-[1.2rem] border border-white/80 bg-gradient-to-br ${palette} font-display text-ink shadow-md`}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}
