export const DEFAULT_AVATAR_ID = "man-adrian";

export const AVATAR_PRESETS = [
  { id: "man-adrian", label: "Adrian", group: "Men", seed: "adrian-young-professional" },
  { id: "man-luca", label: "Luca", group: "Men", seed: "luca-clean-cut" },
  { id: "man-daniel", label: "Daniel", group: "Men", seed: "daniel-city-style" },
  { id: "man-mateo", label: "Mateo", group: "Men", seed: "mateo-smart-casual" },
  { id: "woman-claire", label: "Claire", group: "Women", seed: "claire-fresh-look" },
  { id: "woman-nina", label: "Nina", group: "Women", seed: "nina-modern-style" },
  { id: "woman-sophia", label: "Sophia", group: "Women", seed: "sophia-soft-glam" },
  { id: "woman-leah", label: "Leah", group: "Women", seed: "leah-polished-look" },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

export const AVATAR_PRESET_IDS = AVATAR_PRESETS.map((preset) => preset.id) as AvatarPresetId[];

const LEGACY_AVATAR_MAP: Record<string, AvatarPresetId> = {
  Wave: DEFAULT_AVATAR_ID,
  Felix: "man-adrian",
  Max: "man-luca",
  River: "man-daniel",
  Blaze: "man-mateo",
  Storm: "man-daniel",
  Lily: "woman-claire",
  Jade: "woman-nina",
  Luna: "woman-sophia",
  Sage: "woman-leah",
};

export function normalizeAvatarId(value?: string | null): AvatarPresetId {
  if (value && AVATAR_PRESET_IDS.includes(value as AvatarPresetId)) {
    return value as AvatarPresetId;
  }

  if (value && LEGACY_AVATAR_MAP[value]) {
    return LEGACY_AVATAR_MAP[value];
  }

  return DEFAULT_AVATAR_ID;
}

export function getAvatarPreset(value?: string | null) {
  const normalized = normalizeAvatarId(value);
  return AVATAR_PRESETS.find((preset) => preset.id === normalized) ?? AVATAR_PRESETS[0];
}

export function getAvatarUrl(value?: string | null) {
  const preset = getAvatarPreset(value);
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(preset.seed)}&backgroundColor=fde68a,fbcfe8,b6e3f4,c4b5fd,d1fae5`;
}