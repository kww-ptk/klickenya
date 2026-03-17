'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

function formatKSh(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString()}`;
}

function calculateMonthly(price: number, downPct: number, termYears: number): number {
  const loan = price - price * (downPct / 100);
  const rate = 13.5 / 100 / 12;
  const n = termYears * 12;
  const monthly = (loan * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
  return monthly;
}

const sliderClasses =
  'w-full h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple2 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(139,77,171,0.3)]';

function MortgageCalculator() {
  const [price, setPrice] = useState(8_000_000);
  const [downPct, setDownPct] = useState(20);
  const [term, setTerm] = useState(20);

  const monthly = calculateMonthly(price, downPct, term);

  return (
    <section className="bg-dark py-14 px-5 md:px-10">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
        {/* Left */}
        <div>
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber mb-1.5 block">
            Mortgage Tools
          </span>
          <h2 className="text-[clamp(22px,2.8vw,34px)] font-semibold tracking-[-0.03em] text-white leading-[1.1]">
            Calculate your
            <br />
            mortgage
          </h2>
          <p className="text-[15px] text-white/45 leading-[1.7] mt-2.5">
            Use our mortgage calculator to estimate your monthly repayments. Adjust the
            sliders to match your budget and find the right property for you.
          </p>
        </div>

        {/* Right — Calculator */}
        <div className="bg-white/5 border border-white/[0.07] rounded-[30px] p-7">
          {/* Property price */}
          <div className="mb-4.5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[13px] font-semibold text-white/55">Property price</span>
              <span className="text-[16px] font-bold text-white tracking-[-0.02em]">
                {formatKSh(price)}
              </span>
            </div>
            <input
              type="range"
              min={1_000_000}
              max={50_000_000}
              step={500_000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className={sliderClasses}
            />
          </div>

          {/* Down payment */}
          <div className="mb-4.5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[13px] font-semibold text-white/55">Down payment</span>
              <span className="text-[16px] font-bold text-white tracking-[-0.02em]">
                {downPct}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
              className={sliderClasses}
            />
          </div>

          {/* Loan term */}
          <div className="mb-4.5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[13px] font-semibold text-white/55">Loan term</span>
              <span className="text-[16px] font-bold text-white tracking-[-0.02em]">
                {term} years
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              step={5}
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className={sliderClasses}
            />
          </div>

          {/* Result */}
          <div className="bg-purple2/15 border border-purple2/20 rounded-[16px] p-4 mt-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-white/45 mb-0.5">Monthly repayment</p>
              <p className="text-[28px] font-bold text-white tracking-[-0.04em]">
                {formatKSh(monthly)}
              </p>
            </div>
            <a
              href="/mortgage/apply"
              className="px-5 py-2.5 rounded-full bg-amber text-dark text-[13px] font-bold whitespace-nowrap hover:scale-[1.04] transition-transform"
            >
              Apply now &rarr;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export { MortgageCalculator };
