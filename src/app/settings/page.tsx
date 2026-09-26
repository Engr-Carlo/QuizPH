"use client";

import { useEffect, useMemo, useState } from "react";
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

const avatarGroups = ["Men", "Women"] as const;

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const sessionUser = session?.user;
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarPresetId>(() => normalizeAvatarId(sessionUser?.avatar) ?? DEFAULT_AVATAR_ID);
  const [name, setName] = useState(() => sessionUser?.name ?? "");
  const [email, setEmail] = useState(() => sessionUser?.email ?? "");
  const [university, setUniversity] = useState(() => sessionUser?.university ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePassword, setChangePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const selectedPreset = useMemo(() => getAvatarPreset(selectedAvatar), [selectedAvatar]);

  useEffect(() => {
    if (!sessionUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(sessionUser.name ?? "");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(sessionUser.email ?? "");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUniversity(sessionUser.university ?? "");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedAvatar(normalizeAvatarId(sessionUser.avatar) ?? DEFAULT_AVATAR_ID);
  }, [sessionUser?.id, sessionUser?.name, sessionUser?.email, sessionUser?.avatar, sessionUser?.university]);

  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUniversity = university.trim();
    const originalName = sessionUser?.name ?? "";
    const originalEmail = (sessionUser?.email ?? "").toLowerCase();
    const originalAvatar = normalizeAvatarId(sessionUser?.avatar) ?? DEFAULT_AVATAR_ID;
    const originalUniversity = sessionUser?.university ?? "";

    if (trimmedName.length < 2 && trimmedName !== originalName) {
      setToast({ msg: "Name must be at least 2 characters.", ok: false });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) && trimmedEmail !== originalEmail) {
      setToast({ msg: "Enter a valid email address.", ok: false });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (sessionUser?.role === "TEACHER" && !trimmedUniversity) {
      setToast({ msg: "University is required for teachers.", ok: false });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (changePassword) {
      if (!currentPassword || newPassword.length < 8) {
        setToast({ msg: "Use your current password and set a new password with at least 8 characters.", ok: false });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      if (newPassword !== confirmPassword) {
        setToast({ msg: "New password and confirmation do not match.", ok: false });
        setTimeout(() => setToast(null), 3000);
        return;
      }
    }

    const payload: Record<string, string> = {};
    if (trimmedName !== originalName) payload.name = trimmedName;
    if (trimmedEmail !== originalEmail) payload.email = trimmedEmail;
    if (selectedAvatar !== originalAvatar) payload.avatar = selectedAvatar;
    if (trimmedUniversity !== originalUniversity) payload.university = trimmedUniversity;
    if (changePassword && newPassword) {
      payload.password = newPassword;
      payload.currentPassword = currentPassword;
    }

    if (Object.keys(payload).length === 0) {
      setToast({ msg: "No changes to save yet.", ok: false });
      setTimeout(() => setToast(null), 2200);
      return;
    }

    setSaving(true);

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    setSaving(false);

    if (res.ok) {
      await update({
        name: trimmedName,
        email: trimmedEmail,
        avatar: selectedAvatar,
        university: trimmedUniversity,
        universityVerified: sessionUser?.role === "TEACHER" && trimmedUniversity === originalUniversity
          ? (sessionUser?.universityVerified ?? false)
          : false,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
      setToast({ msg: data.message || "Profile updated successfully.", ok: true });
      setTimeout(() => setToast(null), 4000);
    } else {
      setToast({ msg: data.error || "Failed to update your profile.", ok: false });
      setTimeout(() => setToast(null), 4000);
    }
  }

  const trimmedName = name.trim();
  const trimmedUniversity = university.trim();
  const baseName = session?.user?.name ?? "";
  const baseEmail = session?.user?.email ?? "";
  const currentAvatar = normalizeAvatarId(session?.user?.avatar);
  const hasChanges =
    trimmedName !== baseName ||
    email.trim().toLowerCase() !== baseEmail.toLowerCase() ||
    selectedAvatar !== currentAvatar ||
    trimmedUniversity !== (session?.user?.university ?? "") ||
    (changePassword && Boolean(newPassword || currentPassword || confirmPassword));

  return (
    <DashboardLayout key={sessionUser?.id ?? "guest"}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">Profile settings</h1>
          <p className="mt-1 text-sm text-muted">Edit your personal details, password, and avatar.</p>
        </div>

        <div className="rounded-[28px] bg-card border border-border p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-4 rounded-2xl bg-surface border border-border/60 p-4">
            <img
              src={getAvatarUrl(selectedAvatar)}
              alt={selectedPreset.label}
              className="h-16 w-16 rounded-full border-2 border-primary/30 bg-background"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedPreset.label}</p>
              <p className="text-xs text-muted mt-0.5">
                {selectedPreset.group} &middot; {(selectedPreset as { style?: string }).style ?? ""}
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-foreground">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-foreground">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-foreground">
                  University
                  {sessionUser?.role === "TEACHER" ? (
                    <span className="text-danger"> *</span>
                  ) : (
                    <span className="font-normal text-muted"> (optional)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  autoComplete="organization"
                  placeholder="e.g. University of the Philippines"
                  required={sessionUser?.role === "TEACHER"}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-foreground">Change password</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setChangePassword((prev) => !prev);
                      if (changePassword) {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }
                    }}
                    className="text-xs font-bold text-primary underline-offset-2 hover:underline"
                  >
                    {changePassword ? "Hide" : "Edit"}
                  </button>
                </div>

                {changePassword && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-muted">Current password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        placeholder="Required only when changing password"
                        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-muted">New password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-muted">Confirm password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Re-type the new password"
                        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-base font-black text-foreground">Avatar</h2>
                <div className="space-y-6">
                  {avatarGroups.map((group) => (
                    <section key={group}>
                      <div className="mb-3">
                        <h3 className="text-sm font-black text-foreground">{group}</h3>
                        <p className="text-xs text-muted">
                          {group === "Men" ? "Clean-cut young adult looks." : "Polished young adult looks."}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                                className="h-12 w-12 rounded-full bg-surface"
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
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
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
