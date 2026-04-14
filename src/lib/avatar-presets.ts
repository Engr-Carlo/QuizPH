// Each avatar is fully parameterised — no random seed outcomes.
// Skin: eeb4a4 = light warm white tone (consistent across all).
// All hair styles are youthful (20s–30s) — no bald/balding.
// Background: soft pastel per group.

const BASE = "https://api.dicebear.com/9.x/personas/svg";
const SKIN = "eeb4a4";
const MEN_BG = "dbeafe";    // soft blue
const WOMEN_BG = "fce7f3";  // soft pink

/** Build a fully-specified personas URL, guaranteeing all visible parts. */
function p(params: Record<string, string>) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${BASE}?${qs}`;
}

export const DEFAULT_AVATAR_ID = "man-ethan";

export const AVATAR_PRESETS = [
  // ── Men ─────────────────────────────────────────────────────────────────
  {
    id: "man-ethan",
    label: "Ethan",
    style: "Sharp",
    group: "Men" as const,
    url: p({
      seed: "man-ethan-sharp",
      skinColor: SKIN,
      hair: "shortCombover",
      hairColor: "2c2c2c",
      eyes: "open",
      mouth: "smile",
      nose: "smallRound",
      facialHair: "shadow",
      facialHairProbability: "100",
      body: "squared",
      clothingColor: "1e3a5f",
      backgroundColor: MEN_BG,
    }),
  },
  {
    id: "man-marcus",
    label: "Marcus",
    style: "Formal",
    group: "Men" as const,
    url: p({
      seed: "man-marcus-formal",
      skinColor: SKIN,
      hair: "fade",
      hairColor: "1a1a1a",
      eyes: "open",
      mouth: "smile",
      nose: "mediumRound",
      facialHairProbability: "0",
      body: "squared",
      clothingColor: "2d2d2d",
      backgroundColor: MEN_BG,
    }),
  },
  {
    id: "man-liam",
    label: "Liam",
    style: "Casual",
    group: "Men" as const,
    url: p({
      seed: "man-liam-casual",
      skinColor: SKIN,
      hair: "curly",
      hairColor: "5c3d2e",
      eyes: "happy",
      mouth: "bigSmile",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "rounded",
      clothingColor: "2563eb",
      backgroundColor: MEN_BG,
    }),
  },
  {
    id: "man-noah",
    label: "Noah",
    style: "Soft",
    group: "Men" as const,
    url: p({
      seed: "man-noah-soft",
      skinColor: SKIN,
      hair: "shortComboverChops",
      hairColor: "8b5e3c",
      eyes: "happy",
      mouth: "smile",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "rounded",
      clothingColor: "059669",
      backgroundColor: MEN_BG,
    }),
  },
  {
    id: "man-alex",
    label: "Alex",
    style: "Edgy",
    group: "Men" as const,
    url: p({
      seed: "man-alex-edgy",
      skinColor: SKIN,
      hair: "buzzcut",
      hairColor: "1a1a1a",
      eyes: "open",
      mouth: "smirk",
      nose: "mediumRound",
      facialHair: "goatee",
      facialHairProbability: "100",
      body: "squared",
      clothingColor: "374151",
      backgroundColor: MEN_BG,
    }),
  },
  {
    id: "man-cole",
    label: "Cole",
    style: "Chill",
    group: "Men" as const,
    url: p({
      seed: "man-cole-chill",
      skinColor: SKIN,
      hair: "cap",
      hairColor: "3b1f0e",
      eyes: "happy",
      mouth: "smile",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "rounded",
      clothingColor: "7c3aed",
      backgroundColor: MEN_BG,
    }),
  },
  // ── Women ────────────────────────────────────────────────────────────────
  {
    id: "woman-sofia",
    label: "Sofia",
    style: "Formal",
    group: "Women" as const,
    url: p({
      seed: "woman-sofia-formal",
      skinColor: SKIN,
      hair: "straightBun",
      hairColor: "1a1a1a",
      eyes: "open",
      mouth: "smile",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "squared",
      clothingColor: "1e3a5f",
      backgroundColor: WOMEN_BG,
    }),
  },
  {
    id: "woman-mia",
    label: "Mia",
    style: "Soft",
    group: "Women" as const,
    url: p({
      seed: "woman-mia-soft",
      skinColor: SKIN,
      hair: "long",
      hairColor: "c17f3e",
      eyes: "happy",
      mouth: "bigSmile",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "rounded",
      clothingColor: "db2777",
      backgroundColor: WOMEN_BG,
    }),
  },
  {
    id: "woman-zoe",
    label: "Zoe",
    style: "Sharp",
    group: "Women" as const,
    url: p({
      seed: "woman-zoe-sharp",
      skinColor: SKIN,
      hair: "bobCut",
      hairColor: "1a1a1a",
      eyes: "open",
      mouth: "smirk",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "squared",
      clothingColor: "374151",
      backgroundColor: WOMEN_BG,
    }),
  },
  {
    id: "woman-jade",
    label: "Jade",
    style: "Casual",
    group: "Women" as const,
    url: p({
      seed: "woman-jade-casual",
      skinColor: SKIN,
      hair: "curlyBun",
      hairColor: "5c3d2e",
      eyes: "happy",
      mouth: "smile",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "rounded",
      clothingColor: "0891b2",
      backgroundColor: WOMEN_BG,
    }),
  },
  {
    id: "woman-luna",
    label: "Luna",
    style: "Glam",
    group: "Women" as const,
    url: p({
      seed: "woman-luna-glam",
      skinColor: SKIN,
      hair: "extraLong",
      hairColor: "2c2c2c",
      eyes: "open",
      mouth: "smile",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "rounded",
      clothingColor: "7c3aed",
      backgroundColor: WOMEN_BG,
    }),
  },
  {
    id: "woman-aria",
    label: "Aria",
    style: "Chill",
    group: "Women" as const,
    url: p({
      seed: "woman-aria-chill",
      skinColor: SKIN,
      hair: "bobBangs",
      hairColor: "8b5e3c",
      eyes: "happy",
      mouth: "bigSmile",
      nose: "smallRound",
      facialHairProbability: "0",
      body: "rounded",
      clothingColor: "059669",
      backgroundColor: WOMEN_BG,
    }),
  },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

export const AVATAR_PRESET_IDS = AVATAR_PRESETS.map((preset) => preset.id) as AvatarPresetId[];

const LEGACY_AVATAR_MAP: Record<string, AvatarPresetId> = {
  Wave: DEFAULT_AVATAR_ID,
  Felix: "man-ethan",
  Max: "man-marcus",
  River: "man-liam",
  Blaze: "man-alex",
  Storm: "man-cole",
  Lily: "woman-mia",
  Jade: "woman-jade",
  Luna: "woman-luna",
  Sage: "woman-sofia",
  // Previous preset IDs
  "man-adrian": "man-ethan",
  "man-luca": "man-marcus",
  "man-daniel": "man-liam",
  "man-mateo": "man-noah",
  "woman-claire": "woman-sofia",
  "woman-nina": "woman-jade",
  "woman-sophia": "woman-luna",
  "woman-leah": "woman-aria",
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

/** Returns a fully-specified DiceBear personas URL for the given avatar ID. */
export function getAvatarUrl(value?: string | null) {
  return getAvatarPreset(value).url;
}