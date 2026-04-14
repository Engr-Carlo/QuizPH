"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const VALID_SEEDS = ["Felix", "Lily", "Max", "Jade", "River", "Storm", "Luna", "Sage", "Blaze"] as const;
type Seed = (typeof VALID_SEEDS)[number];

const DICEBEAR_URL = (seed: string) =>
  `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [selectedAvatar, setSelectedAvatar] = useState<Seed>(VALID_SEEDS[0]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Seed initial avatar from session once loaded
  useEffect(() => {
    const current = session?.user?.avatar;
    if (current && VALID_SEEDS.includes(current as Seed)) {
      setSelectedAvatar(current as Seed);
    }
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
      await update();
      router.refresh();
      setToast({ msg: "Avatar updated!", ok: true });
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast({ msg: "Failed to save. Try again.", ok: false });
      setTimeout(() => setToast(null), 3000);
    }
  }

  const hasChanges = selectedAvatar !== (session?.user?.avatar ?? VALID_SEEDS[0]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted">Manage your profile and preferences.</p>
        </div>

        <div className="rounded-[28px] bg-card border border-border p-6 shadow-sm">
          <h2 className="text-base font-black text-foreground mb-1">Avatar</h2>
          <p className="text-sm text-muted mb-6">Pick an avatar that will appear across the platform.</p>

          {/* Current avatar preview */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-surface border border-border/60">
            <img
              src={DICEBEAR_URL(selectedAvatar)}
              alt={selectedAvatar}
              className="w-16 h-16 rounded-full border-2 border-primary/30 bg-background"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedAvatar}</p>
              <p className="text-xs text-muted mt-0.5">Currently selected</p>
            </div>
          </div>

          {/* Avatar grid */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {VALID_SEEDS.map((seed) => {
              const isSelected = selectedAvatar === seed;
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setSelectedAvatar(seed)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/8 shadow-sm"
                      : "border-border bg-white hover:border-primary/35 hover:bg-surface"
                  }`}
                >
                  <img
                    src={DICEBEAR_URL(seed)}
                    alt={seed}
                    className="w-12 h-12 rounded-full bg-surface"
                  />
                  <span className={`text-[11px] font-semibold ${isSelected ? "text-primary" : "text-muted"}`}>
                    {seed}
                  </span>
                </button>
              );
            })}
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
