"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface UniversitySelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
  placeholder?: string;
  label?: string;
}

export default function UniversitySelector({
  value,
  onChange,
  required = false,
  placeholder = "Search or add university",
  label = "University",
}: UniversitySelectorProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const res = await fetch("/api/universities", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setOptions(Array.isArray(data.universities) ? data.universities : []);
      } catch {
        // Ignore quietly; the custom-entry flow continues to work.
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  const normalizedValue = useMemo(
    () => [...new Set(value.map((item) => item.trim()).filter(Boolean))],
    [value]
  );

  const suggestionList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = q
      ? options.filter((option) => {
          const optionText = option.toLowerCase();
          return optionText.includes(q) && !normalizedValue.some((entry) => entry.toLowerCase() === optionText);
        })
      : options.filter((option) => !normalizedValue.some((entry) => entry.toLowerCase() === option.toLowerCase()));

    return entries.slice(0, 8);
  }, [normalizedValue, options, query]);

  const addUniversity = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const next = trimmed.replace(/\s+/g, " ");
    if (normalizedValue.some((entry) => entry.toLowerCase() === next.toLowerCase())) {
      setQuery("");
      setOpen(false);
      return;
    }

    onChange([...normalizedValue, next]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeUniversity = (item: string) => {
    onChange(normalizedValue.filter((entry) => entry.toLowerCase() !== item.toLowerCase()));
  };

  const canAddCustom = query.trim().length > 0 && !normalizedValue.some((entry) => entry.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-bold text-foreground">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
        {normalizedValue.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            {normalizedValue.length} selected
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {normalizedValue.length === 0 ? (
          <div className="w-full rounded-2xl border border-dashed border-border bg-surface px-3 py-2.5 text-xs text-muted">
            No university selected yet.
          </div>
        ) : (
          normalizedValue.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => removeUniversity(entry)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/12"
            >
              <span>{entry}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))
        )}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (suggestionList[0]) {
                addUniversity(suggestionList[0]);
              } else if (query.trim()) {
                addUniversity(query);
              }
            }
          }}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder={placeholder}
        />

        {open && (suggestionList.length > 0 || canAddCustom) && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
            {suggestionList.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  addUniversity(option);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-surface"
              >
                <span>{option}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Add</span>
              </button>
            ))}

            {canAddCustom && (
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  addUniversity(query);
                }}
                className="flex w-full items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-left text-sm text-primary transition hover:bg-primary/5"
              >
                <span>Add “{query.trim()}”</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Custom</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
