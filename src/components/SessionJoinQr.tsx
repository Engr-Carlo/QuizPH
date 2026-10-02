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
      className={`flex items-center ${compact ? "gap-3" : "gap-4"} rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]`}
      title={`Scan to join session ${code}`}
    >
      <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-inner ${compact ? "h-[84px] w-[84px]" : "h-[102px] w-[102px]"}`}>
        {hasError ? (
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">QR</span>
        ) : dataUrl ? (
          <img src={dataUrl} alt={`QR code for session ${code}`} className="h-full w-full rounded-xl object-contain" />
        ) : (
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
        )}
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Scan to join</p>
          <p className="mt-1 font-mono text-lg font-black tracking-[0.18em] text-primary">{code}</p>
        </div>
      )}
    </div>
  );
}
