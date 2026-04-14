"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AVATAR_PRESETS,
  DEFAULT_AVATAR_ID,
  getAvatarPreset,
  getAvatarUrl,
  normalizeAvatarId,
  type AvatarPresetId,
} from "@/lib/avatar-presets";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarPresetId>(DEFAULT_AVATAR_ID);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const avatarGroups = ["Men", "Women"] as const;
  const selectedPreset = getAvatarPreset(selectedAvatar);

  useEffect(() => {
    setSelectedAvatar(normalizeAvatarId(session?.user?.avatar));
  }, [session?.user?.avatar]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: selectedAvatar }),
    });
    setSaving(false);
    if (res.ok) {
      await update({ avatar: selectedAvatar });
      router.refresh();
      setToast({ msg: "Avatar updated!", ok: true });
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast({ msg: "Failed to save. Try again.", ok: false });
      setTimeout(() => setToast(null), 3000);
    }
  }

  const hasChanges = selectedAvatar !== normalizeAvatarId(session?.user?.avatar);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted">Manage your profile and preferences.</p>
        </div>

        <div className="rounded-[28px] bg-card border border-border p-6 shadow-sm">
          <h2 className="text-base font-black text-foreground mb-1">Avatar</h2>
          <p className="text-sm text-muted mb-6">Choose from curated young adult avatars with separate men and women options.</p>

          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-surface border border-border/60">
            <img
              src={getAvatarUrl(selectedAvatar)}
              alt={selectedPreset.label}
              className="w-16 h-16 rounded-full border-2 border-primary/30 bg-background"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedPreset.label}</p>
              <p className="text-xs text-muted mt-0.5">
                {selectedPreset.group} &middot; {(selectedPreset as { style?: string }).style ?? ""}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {avatarGroups.map((group) => (
              <section key={group}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-foreground">{group}</h3>
                    <p className="text-xs text-muted">
                      {group === "Men" ? "Handsome, clean-cut young adult looks." : "Pretty, polished young adult looks."}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {AVATAR_PRESETS.filter((preset) => preset.group === group).map((preset) => {
                    const isSelected = selectedAvatar === preset.id;
                    const p = preset as typeof preset & { style?: string };
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatar(preset.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2.5 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/8 shadow-sm"
                            : "border-border bg-white hover:border-primary/35 hover:bg-surface"
                        }`}
                      >
                        <img
                          src={getAvatarUrl(preset.id)}
                          alt={preset.label}
                          className="h-14 w-14 rounded-full bg-surface"
                        />
                        <span className={`text-[11px] font-bold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {preset.label}
                        </span>
                        <span className={`text-[10px] leading-tight ${isSelected ? "text-primary/70" : "text-muted"}`}>
                          {p.style}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            {toast && (
              <p className={`text-sm font-medium ${toast.ok ? "text-success" : "text-danger"}`}>
                {toast.msg}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
