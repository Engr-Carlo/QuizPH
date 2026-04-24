"use client";

import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface PatchNote {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  _count: { reads: number };
}

interface EditorState {
  id?: string;
  title: string;
  body: string;
}

export default function PatchNotesAdminPage() {
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function fetchNotes() {
    const res = await fetch("/api/admin/patch-notes");
    if (res.ok) setNotes(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  async function openEdit(id: string) {
    const res = await fetch(`/api/admin/patch-notes/${id}`);
    if (!res.ok) return;
    const note = await res.json();
    setEditor({ id: note.id, title: note.title, body: note.body });
  }

  function wrapSelection(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const newVal =
      ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
    setEditor((e) => (e ? { ...e, body: newVal } : e));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }

  function makeBullets() {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end) || "Item 1\nItem 2";
    const items = selected
      .split("\n")
      .map((l) => `  <li>${l.trim()}</li>`)
      .join("\n");
    const wrapped = `<ul>\n${items}\n</ul>`;
    const newVal = ta.value.slice(0, start) + wrapped + ta.value.slice(end);
    setEditor((e) => (e ? { ...e, body: newVal } : e));
  }

  function insertLink() {
    const url = prompt("URL (e.g. https://example.com):");
    if (!url) return;
    wrapSelection(`<a href="${url}" target="_blank" rel="noopener">`, "</a>");
  }

  async function handlePublish() {
    if (!editor?.title.trim() || !editor?.body.trim()) return;
    setSaving(true);
    try {
      if (editor.id) {
        await fetch(`/api/admin/patch-notes/${editor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editor.title, body: editor.body }),
        });
      } else {
        await fetch("/api/admin/patch-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editor.title, body: editor.body }),
        });
      }
      setEditor(null);
      await fetchNotes();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    await fetch(`/api/admin/patch-notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchNotes();
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this patch note?")) return;
    await fetch(`/api/admin/patch-notes/${id}`, { method: "DELETE" });
    fetchNotes();
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Patch Notes</h1>
            <p className="text-sm text-muted mt-0.5">
              Publish announcements shown once to every logged-in user.
            </p>
          </div>
          <button
            onClick={() => setEditor({ title: "", body: "" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition shadow-[0_2px_8px_rgba(37,99,235,0.35)]"
          >
            + New Patch Note
          </button>
        </div>

        {/* ── Editor ── */}
        {editor && (
          <div className="mb-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Editor header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-background/50">
              <h2 className="text-sm font-bold text-foreground">
                {editor.id ? "Edit Patch Note" : "New Patch Note"}
              </h2>
              <button
                onClick={() => setEditor(null)}
                className="text-xs text-muted hover:text-foreground transition"
              >
                Cancel
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title input */}
              <input
                type="text"
                value={editor.title}
                onChange={(e) =>
                  setEditor((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
                placeholder="Patch note title…"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />

              {/* Formatting toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-border">
                <span className="text-[11px] text-muted font-semibold mr-1 uppercase tracking-wide">
                  Format
                </span>
                {[
                  {
                    label: "B",
                    title: "Bold",
                    cls: "font-bold",
                    action: () => wrapSelection("<strong>", "</strong>"),
                  },
                  {
                    label: "I",
                    title: "Italic",
                    cls: "italic",
                    action: () => wrapSelection("<em>", "</em>"),
                  },
                  {
                    label: "H2",
                    title: "Heading",
                    cls: "text-[11px]",
                    action: () => wrapSelection("<h2>", "</h2>"),
                  },
                  {
                    label: "•",
                    title: "Bullet list",
                    cls: "text-base",
                    action: makeBullets,
                  },
                  {
                    label: "🔗",
                    title: "Insert link",
                    cls: "",
                    action: insertLink,
                  },
                  {
                    label: "—",
                    title: "Divider",
                    cls: "text-base",
                    action: () =>
                      setEditor((e) =>
                        e ? { ...e, body: e.body + "\n<hr />\n" } : e
                      ),
                  },
                ].map(({ label, title, cls, action }) => (
                  <button
                    key={label}
                    type="button"
                    title={title}
                    onClick={action}
                    className={`min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-lg border border-border bg-surface text-sm text-foreground hover:bg-primary/10 hover:border-primary/30 transition ${cls}`}
                  >
                    {label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen((v) => !v)}
                    className="text-[11px] font-medium text-muted hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-surface border border-transparent hover:border-border"
                  >
                    {previewOpen ? "Hide preview" : "Show preview"}
                  </button>
                </div>
              </div>

              {/* Editor + Preview */}
              <div className={`grid gap-4 ${previewOpen ? "grid-cols-2" : "grid-cols-1"}`}>
                {/* Textarea */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                    HTML Body
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={editor.body}
                    onChange={(e) =>
                      setEditor((prev) =>
                        prev ? { ...prev, body: e.target.value } : prev
                      )
                    }
                    placeholder="Write your announcement here, or use the toolbar buttons above to insert formatted content."
                    rows={14}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition"
                  />
                </div>

                {/* Preview */}
                {previewOpen && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                      Preview
                    </label>
                    <div
                      className="min-h-[200px] max-h-[320px] overflow-auto rounded-xl border border-border bg-surface px-5 py-4 text-sm text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_em]:italic [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_hr]:border-border [&_hr]:my-3"
                      dangerouslySetInnerHTML={{
                        __html:
                          editor.body ||
                          '<span style="color:var(--muted)"><em>Nothing to preview yet…</em></span>',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setEditor(null)}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={saving || !editor.title.trim() || !editor.body.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
                >
                  {saving ? "Publishing…" : editor.id ? "Save Changes" : "Publish Note"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Notes table ── */}
        {loading ? (
          <div className="py-20 text-center text-sm text-muted">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted">
            No patch notes yet. Create one to announce updates to all users.
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left px-5 py-3 font-semibold text-foreground">Title</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Seen by</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Published</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} className="border-t border-border hover:bg-primary/[0.03] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">{note.title}</td>
                    <td className="text-center px-4 py-3.5">
                      <button
                        onClick={() => handleToggle(note.id, note.isActive)}
                        className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                          note.isActive
                            ? "bg-success/15 text-success hover:bg-success/25"
                            : "bg-muted/15 text-muted hover:bg-muted/25"
                        }`}
                      >
                        {note.isActive ? "● Active" : "○ Inactive"}
                      </button>
                    </td>
                    <td className="text-center px-4 py-3.5 text-muted">
                      {note._count.reads}
                    </td>
                    <td className="px-4 py-3.5 text-muted text-xs">
                      {new Date(note.createdAt).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEdit(note.id)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="text-xs font-semibold text-danger hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
