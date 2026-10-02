"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type SessionJoinQrProps = {
  code: string;
  size?: number;
  compact?: boolean;
};

export default function SessionJoinQr({ code, size = 72, compact = false }: SessionJoinQrProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setDataUrl("");
      setHasError(false);
      return;
    }

    const joinUrl = `${window.location.origin}/student/join?code=${encodeURIComponent(trimmedCode)}`;
    QRCode.toDataURL(joinUrl, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        setDataUrl(url);
        setHasError(false);
      })
      .catch(() => {
        setDataUrl("");
        setHasError(true);
      });
  }, [code, size]);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-border bg-surface/80 ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
      title={`Scan to join session ${code}`}
    >
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-1 shadow-sm">
        {hasError ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">QR</span>
        ) : dataUrl ? (
          <img src={dataUrl} alt={`QR code for session ${code}`} className="h-full w-full object-contain" />
        ) : (
          <div className="h-full w-full animate-pulse rounded-md bg-slate-100" />
        )}
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Scan to join</p>
          <p className="mt-0.5 font-mono text-sm font-extrabold tracking-[0.2em] text-primary">{code}</p>
        </div>
      )}
    </div>
  );
}
