import { describe, expect, it } from "vitest";
import { convert, roundConverted, type KesRates } from "../currency";

/** Close to the live rates on the day this was written. */
const RATES: KesRates = { KES: 1, EUR: 151, USD: 129.4, GBP: 176.5 };

describe("convert", () => {
  it("is a no-op between the same currency", () => {
    expect(convert(205_000, "EUR", "EUR", RATES)).toBe(205_000);
  });

  it("converts a euro asking price into shillings", () => {
    expect(Math.round(convert(205_000, "EUR", "KES", RATES))).toBe(30_955_000);
  });

  it("converts shillings back into euro", () => {
    expect(Math.round(convert(30_955_000, "KES", "EUR", RATES))).toBe(205_000);
  });

  it("round trips through a third currency", () => {
    const usd = convert(205_000, "EUR", "USD", RATES);
    expect(Math.round(convert(usd, "USD", "EUR", RATES))).toBe(205_000);
  });

  it("does not divide by zero on a broken rate table", () => {
    const broken = { ...RATES, EUR: 0 } as KesRates;
    expect(Number.isFinite(convert(1000, "KES", "EUR", broken))).toBe(true);
  });
});

describe("roundConverted", () => {
  /*
   * A daily rate cannot support "KSh 30,955,000" to the shilling. Rounding to
   * the precision the rate justifies keeps the figure honest and readable.
   */
  it("rounds to the nearest hundred thousand above ten million", () => {
    expect(roundConverted(30_955_000)).toBe(31_000_000);
  });

  it("rounds to the nearest ten thousand in the millions", () => {
    expect(roundConverted(1_234_567)).toBe(1_230_000);
  });

  it("rounds to the nearest thousand in the hundred thousands", () => {
    expect(roundConverted(155_400)).toBe(155_000);
  });

  it("rounds to the nearest hundred in the thousands", () => {
    expect(roundConverted(9_440)).toBe(9_400);
  });

  it("leaves amounts under a thousand exact", () => {
    expect(roundConverted(940)).toBe(940);
    expect(roundConverted(12)).toBe(12);
  });
});

describe("what a buyer sees", () => {
  it("a 205,000 euro villa reads as about 31 million shillings", () => {
    const shown = roundConverted(convert(205_000, "EUR", "KES", RATES));
    expect(shown).toBe(31_000_000);
  });

  it("a 12 million shilling flat reads as about 79,500 euro", () => {
    const shown = roundConverted(convert(12_000_000, "KES", "EUR", RATES));
    expect(shown).toBe(79_500);
  });
});
