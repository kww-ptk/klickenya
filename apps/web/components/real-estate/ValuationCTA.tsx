'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FormState {
  address: string;
  propertyType: string;
  bedrooms: string;
  sizeSqm: string;
  condition: string;
}

const initialForm: FormState = {
  address: '',
  propertyType: '',
  bedrooms: '',
  sizeSqm: '',
  condition: '',
};

const inputClasses =
  'w-full px-3.5 py-3 border-[1.5px] border-border rounded-[10px] text-[14px] text-text bg-white outline-none focus:border-purple2 transition-colors';
const labelClasses = 'text-[12.5px] font-semibold text-text2 mb-1 block';

function ValuationCTA() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [showResult, setShowResult] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setShowResult(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowResult(true);
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #6B2D8B 0%, #8B4DAB 50%, #9B5ABF 100%)',
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          top: -150,
          right: -100,
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          bottom: -120,
          left: -80,
          background: 'radial-gradient(circle, rgba(232,160,32,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center py-20 px-5 md:px-10">
        {/* Left */}
        <div>
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber/80 mb-1.5 block">
            Free Valuation
          </span>
          <h2 className="text-[clamp(30px,4vw,50px)] font-bold text-white tracking-[-0.04em] leading-[1.05] mb-4">
            What&apos;s your home worth in{' '}
            <em className="text-amber not-italic">2026</em>?
          </h2>
          <p className="text-[16px] text-white/50 leading-[1.7] mb-8">
            Get an instant AI-powered estimate based on recent sales, market trends, and
            property characteristics in your area. No obligation, completely free.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/valuation"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber text-dark text-[14px] font-bold shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(232,160,32,0.45)] transition-all"
            >
              Get your free valuation
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white text-[14px] font-bold hover:bg-white/10 transition-colors"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* Right — Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.97] rounded-[30px] p-8 shadow-xl"
        >
          <h3 className="text-[18px] font-bold text-text mb-1.5">
            Get your instant estimate
          </h3>
          <p className="text-[13px] text-text2 mb-6">
            Enter your property details to receive an AI-powered valuation.
          </p>

          {/* Address */}
          <div className="mb-3.5">
            <label className={labelClasses}>Property address</label>
            <input
              type="text"
              placeholder="e.g. 42 Ngong Road, Kilimani"
              className={inputClasses}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              required
            />
          </div>

          {/* Row: Type + Bedrooms */}
          <div className="grid grid-cols-2 gap-3 mb-3.5">
            <div>
              <label className={labelClasses}>Property type</label>
              <select
                className={inputClasses}
                value={form.propertyType}
                onChange={(e) => update('propertyType', e.target.value)}
                required
              >
                <option value="">Select</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="townhouse">Townhouse</option>
                <option value="villa">Villa</option>
                <option value="land">Land</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Bedrooms</label>
              <select
                className={inputClasses}
                value={form.bedrooms}
                onChange={(e) => update('bedrooms', e.target.value)}
                required
              >
                <option value="">Select</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5+</option>
              </select>
            </div>
          </div>

          {/* Row: Size + Condition */}
          <div className="grid grid-cols-2 gap-3 mb-3.5">
            <div>
              <label className={labelClasses}>Size (sqm)</label>
              <input
                type="number"
                placeholder="e.g. 120"
                className={inputClasses}
                value={form.sizeSqm}
                onChange={(e) => update('sizeSqm', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClasses}>Condition</label>
              <select
                className={inputClasses}
                value={form.condition}
                onChange={(e) => update('condition', e.target.value)}
              >
                <option value="">Select</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs-renovation">Needs renovation</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-[16px] bg-purple2 text-white text-[14.5px] font-bold shadow-[0_4px_14px_rgba(139,77,171,0.35)] hover:bg-[#9B5ABF] hover:-translate-y-0.5 transition-all"
          >
            Get estimate
          </button>

          {/* Result */}
          {showResult && (
            <div className="mt-4 bg-purple2/10 border border-purple2/20 rounded-[16px] p-5 text-center">
              <p className="text-[13px] text-text2 mb-1">Estimated market value</p>
              <p className="text-[32px] font-bold text-text tracking-[-0.04em]">
                KSh 14,200,000
              </p>
              <p className="text-[12px] text-text3 mt-1">
                Range: KSh 12.5M &ndash; KSh 16.1M
              </p>
            </div>
          )}

          <p className="text-[11.5px] text-text3 text-center mt-3 leading-[1.5]">
            This is an automated estimate and should not be used as a formal valuation.
            For an accurate valuation, consult a certified property valuer.
          </p>
        </form>
      </div>
    </section>
  );
}

export { ValuationCTA };
