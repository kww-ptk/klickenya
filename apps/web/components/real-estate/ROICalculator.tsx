'use client';

import { useState } from 'react';

function formatKES(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString()}`;
}

const sliderClasses =
  'w-full h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(232,160,32,0.3)]';

function ROICalculator() {
  const [price, setPrice] = useState(15_000_000);
  const [monthlyRent, setMonthlyRent] = useState(80_000);
  const [expensePct, setExpensePct] = useState(15);
  const [vacancyPct, setVacancyPct] = useState(5);

  const annualRent = monthlyRent * 12;
  const grossYield = (annualRent / price) * 100;
  const expenses = annualRent * (expensePct / 100);
  const vacancyLoss = annualRent * (vacancyPct / 100);
  const annualNetIncome = annualRent - expenses - vacancyLoss;
  const netYield = (annualNetIncome / price) * 100;
  const paybackYears = annualNetIncome > 0 ? price / annualNetIncome : Infinity;

  return (
    <section className="bg-zinc-950 py-14 px-5 md:px-10">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
        {/* Left */}
        <div>
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber mb-1.5 block">
            Investment Tools
          </span>
          <h2 className="text-[clamp(22px,2.8vw,34px)] font-semibold tracking-[-0.03em] text-white leading-[1.1]">
            Rental ROI
            <br />
            Calculator
          </h2>
          <p className="text-[15px] text-white/45 leading-[1.7] mt-2.5">
            Calculate your rental investment returns. Adjust the sliders to
            estimate yield, net income, and payback period for any property.
          </p>
        </div>

        {/* Right — Calculator */}
        <div className="bg-white/5 border border-white/[0.07] rounded-[30px] p-7">
          {/* Property price */}
          <div className="mb-4.5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[13px] font-semibold text-white/55">Property price</span>
              <span className="text-[16px] font-bold text-white tracking-[-0.02em]">
                {formatKES(price)}
              </span>
            </div>
            <input
              type="range"
              min={1_000_000}
              max={100_000_000}
              step={500_000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className={sliderClasses}
            />
          </div>

          {/* Monthly rent */}
          <div className="mb-4.5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[13px] font-semibold text-white/55">Expected monthly rent</span>
              <span className="text-[16px] font-bold text-white tracking-[-0.02em]">
                {formatKES(monthlyRent)}
              </span>
            </div>
            <input
              type="range"
              min={10_000}
              max={500_000}
              step={5_000}
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(Number(e.target.value))}
              className={sliderClasses}
            />
          </div>

          {/* Annual expenses */}
          <div className="mb-4.5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[13px] font-semibold text-white/55">Annual expenses %</span>
              <span className="text-[16px] font-bold text-white tracking-[-0.02em]">
                {expensePct}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={expensePct}
              onChange={(e) => setExpensePct(Number(e.target.value))}
              className={sliderClasses}
            />
            <p className="text-[11px] text-white/30 mt-1">Maintenance, insurance, management</p>
          </div>

          {/* Vacancy rate */}
          <div className="mb-4.5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[13px] font-semibold text-white/55">Vacancy rate %</span>
              <span className="text-[16px] font-bold text-white tracking-[-0.02em]">
                {vacancyPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={vacancyPct}
              onChange={(e) => setVacancyPct(Number(e.target.value))}
              className={sliderClasses}
            />
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-amber/10 border border-amber/20 rounded-[16px] p-4">
              <p className="text-[12px] text-white/45 mb-0.5">Gross rental yield</p>
              <p className="text-[24px] font-bold text-amber tracking-[-0.04em]">
                {grossYield.toFixed(1)}%
              </p>
            </div>
            <div className="bg-amber/10 border border-amber/20 rounded-[16px] p-4">
              <p className="text-[12px] text-white/45 mb-0.5">Net rental yield</p>
              <p className="text-[24px] font-bold text-amber tracking-[-0.04em]">
                {netYield.toFixed(1)}%
              </p>
            </div>
            <div className="bg-amber/10 border border-amber/20 rounded-[16px] p-4">
              <p className="text-[12px] text-white/45 mb-0.5">Annual net income</p>
              <p className="text-[20px] font-bold text-white tracking-[-0.04em]">
                {formatKES(annualNetIncome)}
              </p>
            </div>
            <div className="bg-amber/10 border border-amber/20 rounded-[16px] p-4">
              <p className="text-[12px] text-white/45 mb-0.5">Payback period</p>
              <p className="text-[20px] font-bold text-white tracking-[-0.04em]">
                {paybackYears === Infinity ? '—' : `${paybackYears.toFixed(1)} yrs`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { ROICalculator };
