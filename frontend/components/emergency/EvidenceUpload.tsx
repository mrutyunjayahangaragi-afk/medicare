"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { uploadEvidence } from "@/lib/emergency";

interface EvidenceUploadProps {
  userId: string;
  requestId: string;
  value: string | null;       // storage path
  previewUrl: string | null;  // local blob or signed url
  onChange: (path: string | null, preview: string | null) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function EvidenceUpload({
  userId,
  requestId,
  value,
  previewUrl,
  onChange,
}: EvidenceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5 MB.");
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setUploading(true);

    const { path, error: upErr } = await uploadEvidence(userId, requestId, file);

    setUploading(false);

    if (upErr || !path) {
      setError(upErr ?? "Upload failed.");
      URL.revokeObjectURL(objectUrl);
      return;
    }

    onChange(path, objectUrl);
  };

  const handleRemove = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    onChange(null, null);
    setError(null);
  };

  return (
    <div>
      <p className="text-sm font-bold text-slate-700 mb-1.5">
        Evidence Photo{" "}
        <span className="text-xs text-slate-400 font-normal">(optional · max 5 MB)</span>
      </p>

      {previewUrl ? (
        <div className="relative w-full max-w-xs rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 text-[#E53935] animate-spin" />
            </div>
          )}
          <Image
            src={previewUrl}
            alt="Evidence preview"
            width={400}
            height={240}
            className="w-full h-40 object-cover"
            unoptimized={previewUrl.startsWith("blob:")}
          />
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-red-600 cursor-pointer transition-colors"
              aria-label="Remove evidence photo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {value && !uploading && (
            <p className="px-3 py-1.5 text-[11px] text-slate-400 font-mono truncate bg-slate-50 border-t border-slate-100">
              {value}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 w-full max-w-xs h-32 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#E53935] hover:bg-red-50/40 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]/40"
          aria-label="Upload evidence photo"
        >
          <ImagePlus className="w-6 h-6 text-slate-400" aria-hidden="true" />
          <span className="text-xs text-slate-500 font-medium">JPEG · PNG · WebP</span>
        </button>
      )}

      {error && <p className="mt-1.5 text-xs font-medium text-[#E53935]" role="alert">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
      />
    </div>
  );
}
