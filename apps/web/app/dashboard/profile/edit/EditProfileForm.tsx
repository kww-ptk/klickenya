"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface EditProfileFormProps {
  sanityHostId: string;
  currentName: string;
  currentBio: string;
  currentWebsite: string;
  currentInstagram: string;
  currentFacebook: string;
  currentPhone: string;
  currentPhotoUrl: string | null;
}

export function EditProfileForm({
  sanityHostId,
  currentName,
  currentBio,
  currentWebsite,
  currentInstagram,
  currentFacebook,
  currentPhone,
  currentPhotoUrl,
}: EditProfileFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio);
  const [website, setWebsite] = useState(currentWebsite);
  const [instagram, setInstagram] = useState(currentInstagram);
  const [facebook, setFacebook] = useState(currentFacebook);
  const [phone, setPhone] = useState(currentPhone);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(currentPhotoUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set("sanityHostId", sanityHostId);
      formData.set("name", name);
      formData.set("bio", bio);
      formData.set("website", website);
      formData.set("instagram", instagram);
      formData.set("facebook", facebook);
      formData.set("phone", phone);
      if (photoFile) {
        formData.set("photo", photoFile);
      }

      const res = await fetch("/api/dashboard/profile/update", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const inputCls =
    "w-full h-[48px] px-4 rounded-xl border border-border text-[16px] text-dark placeholder:text-text3 outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors bg-white";
  const labelCls = "block text-[14px] font-semibold text-dark mb-1.5";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="size-10 flex items-center justify-center rounded-xl border border-border text-text3 hover:border-dark hover:text-dark transition-colors"
        >
          ←
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
          Edit Profile
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        {/* Photo */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <p className={labelCls}>Profile photo</p>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-amber to-purple">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[22px] font-bold">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[14px] font-semibold text-purple bg-purple/8 px-4 h-[40px] rounded-xl hover:bg-purple/15 transition-colors"
              >
                Change photo
              </button>
              <p className="text-[12px] text-text3 mt-1">JPG or PNG, max 5MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Name */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <label className={labelCls}>Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name or business name"
            required
            className={inputCls}
          />
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <label className={labelCls}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell guests about yourself or your business..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border text-[16px] text-dark placeholder:text-text3 outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 transition-colors bg-white resize-none"
          />
        </div>

        {/* Online presence */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
          <p className="text-[14px] font-semibold text-dark">Online presence</p>
          <div>
            <label className="text-[13px] text-text2 mb-1 block">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourbusiness.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[13px] text-text2 mb-1 block">Instagram</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourhandle"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[13px] text-text2 mb-1 block">Facebook</label>
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="Page name or URL"
              className={inputCls}
            />
          </div>
        </div>

        {/* Phone */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <label className={labelCls}>Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254 700 000 000"
            className={inputCls}
          />
          <p className="text-[12px] text-text3 mt-1.5">Not shown publicly</p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[14px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="w-full h-[48px] bg-amber text-dark font-bold text-[15px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-60 flex items-center justify-center"
        >
          {isLoading ? (
            <svg className="animate-spin size-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            "Save changes"
          )}
        </button>
      </form>
    </div>
  );
}
