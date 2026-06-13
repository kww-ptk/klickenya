"use client";

import { useRef, useState } from "react";

export interface UploadedImage {
  assetId: string;
  url: string;
  alt: string;
}

interface ImageUploaderProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  label?: string;
  hint?: string;
}

export function ImageUploader({
  value,
  onChange,
  maxImages = 10,
  label = "Photos",
  hint,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const remaining = maxImages - value.length;
    if (remaining <= 0) return;
    const toUpload = arr.slice(0, remaining);

    setError("");
    setUploading(true);

    const results: UploadedImage[] = [];

    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);

      try {
        const res = await fetch("/api/uploads/sanity-image", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Upload failed.");
          continue;
        }
        results.push({ assetId: json.assetId, url: json.url, alt: "" });
      } catch {
        setError("Upload failed. Please try again.");
      }
    }

    if (results.length > 0) {
      onChange([...value, ...results]);
    }

    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function handleRemove(assetId: string) {
    onChange(value.filter((img) => img.assetId !== assetId));
  }

  function handleAltChange(assetId: string, alt: string) {
    onChange(value.map((img) => (img.assetId === assetId ? { ...img, alt } : img)));
  }

  const canAddMore = value.length < maxImages && !uploading;

  return (
    <div>
      {label && (
        <p className="text-sm font-semibold text-dark mb-2">{label}</p>
      )}
      {hint && <p className="text-xs text-text3 mb-3">{hint}</p>}

      {/* Drop zone */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-3 ${
            dragging
              ? "border-amber bg-[#FDF8F0]"
              : "border-[#D4CFC6] hover:border-amber/60 bg-canvas"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="size-6 animate-spin text-amber" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-text2">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg className="size-8 text-text3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-text2">
                <span className="font-semibold text-amber">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-text3">
                JPEG, PNG, WebP · max 10 MB · up to {maxImages} photos
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {error && (
        <p className="text-xs text-red-600 mb-3">{error}</p>
      )}

      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((img) => (
            <div key={img.assetId} className="relative group rounded-xl overflow-hidden border border-border bg-[#F7F5F2]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${img.url}?w=300&h=200&fit=crop&auto=format`}
                alt={img.alt || "Upload"}
                className="w-full h-24 object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(img.assetId)}
                className="absolute top-1.5 right-1.5 size-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                title="Remove"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="p-2">
                <input
                  type="text"
                  value={img.alt}
                  onChange={(e) => handleAltChange(img.assetId, e.target.value)}
                  placeholder="Caption (optional)"
                  className="w-full text-xs border-0 border-b border-border bg-transparent text-dark placeholder-text3 focus:outline-none focus:border-amber pb-0.5"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
