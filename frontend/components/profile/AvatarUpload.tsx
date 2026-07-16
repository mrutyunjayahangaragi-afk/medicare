"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { uploadAvatar } from "@/lib/profile";
import { useToast } from "@/components/ui/Toast";

interface AvatarUploadProps {
  currentUrl: string | null;
  displayName: string;
  onUpload?: (url: string) => void;
}

const MAX_SIZE_MB = 3;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function AvatarUpload({ currentUrl, displayName, onUpload }: AvatarUploadProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected after an error
    e.target.value = "";

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }

    setError(null);

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    const { url, error: uploadError } = await uploadAvatar(file);

    setUploading(false);

    if (uploadError || !url) {
      setError(uploadError ?? "Upload failed. Please try again.");
      setPreview(currentUrl);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    URL.revokeObjectURL(objectUrl);
    setPreview(url);
    onUpload?.(url);
    toast("Profile updated successfully.", "success");
    router.refresh();
  };

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {/* Avatar circle */}
        <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-slate-100">
          {preview ? (
            <Image
              src={preview}
              alt={`${displayName} profile photo`}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              unoptimized={preview.startsWith("blob:")}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-400 to-red-600 text-white text-2xl font-black select-none"
              aria-label={`Avatar initials: ${initials}`}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Upload new profile photo"
        >
          {uploading
            ? <Loader2 className="w-6 h-6 text-white animate-spin" />
            : <Camera className="w-6 h-6 text-white" />
          }
        </button>

        {/* Camera badge */}
        {!uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#E53935] hover:bg-[#C62828] rounded-full flex items-center justify-center border-2 border-white shadow cursor-pointer transition-colors"
            aria-label="Change profile photo"
            tabIndex={-1}
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="sr-only"
          onChange={handleFile}
          aria-label="Profile photo file input"
        />
      </div>

      {uploading && (
        <p className="text-xs text-slate-400 animate-pulse">Uploading…</p>
      )}
      {error && (
        <p className="text-xs text-red-500 font-medium text-center max-w-[160px]" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400 text-center">
        JPG, PNG or WEBP · Max {MAX_SIZE_MB} MB
      </p>
    </div>
  );
}
