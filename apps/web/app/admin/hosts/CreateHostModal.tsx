"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateHostModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hosts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setName("");
        setEmail("");
        setPhone("");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors"
      >
        + Create Host
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-[20px] font-bold text-dark mb-4">Create New Host</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-text3 uppercase tracking-wide mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-[14px] rounded-xl border border-border bg-canvas text-dark outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text3 uppercase tracking-wide mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-[14px] rounded-xl border border-border bg-canvas text-dark outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text3 uppercase tracking-wide mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 text-[14px] rounded-xl border border-border bg-canvas text-dark outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
                  placeholder="+254..."
                />
              </div>
            </div>

            {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}
            {success && <p className="mt-3 text-[13px] text-[#22C55E] font-medium">Host created! Welcome email sent.</p>}

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || !email.trim() || loading}
                className="px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Host"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-[13px] font-medium rounded-xl border border-border text-text3 hover:bg-[#F5F3F0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
