import { describe, it, expect } from "vitest";
import { parseCoordinates, mapsUrl } from "@/lib/orders/location";

describe("parseCoordinates", () => {
  it("reads plain coordinates", () => {
    expect(parseCoordinates("-3.3456, 40.0123")).toEqual({ lat: -3.3456, lng: 40.0123 });
    expect(parseCoordinates("-3.3456,40.0123")).toEqual({ lat: -3.3456, lng: 40.0123 });
  });

  it("reads a Maps URL copied from the address bar", () => {
    expect(
      parseCoordinates("https://www.google.com/maps/@-3.3456,40.0123,17z"),
    ).toEqual({ lat: -3.3456, lng: 40.0123 });
  });

  it("reads a place link", () => {
    expect(
      parseCoordinates(
        "https://www.google.com/maps/place/Napule/@-3.3521,40.0198,17z/data=!3m1!4b1",
      ),
    ).toEqual({ lat: -3.3521, lng: 40.0198 });
  });

  it("reads share-sheet and search links", () => {
    expect(parseCoordinates("https://maps.google.com/?q=-3.34,40.01")).toEqual({
      lat: -3.34,
      lng: 40.01,
    });
    expect(
      parseCoordinates("https://www.google.com/maps/search/?api=1&query=-3.34,40.01"),
    ).toEqual({ lat: -3.34, lng: 40.01 });
  });

  it("returns null for a written address, which stays free text", () => {
    expect(parseCoordinates("Behind the blue gate, past Sunset Lab")).toBeNull();
    expect(parseCoordinates("")).toBeNull();
    expect(parseCoordinates(null)).toBeNull();
  });

  it("does not invent a pin from a short link", () => {
    // No coordinates in the string: resolving it needs a redirect we do not follow.
    expect(parseCoordinates("https://maps.app.goo.gl/aBcDeF12345")).toBeNull();
  });

  it("rejects out-of-range and null-island values", () => {
    expect(parseCoordinates("91.0, 40.0")).toBeNull();
    expect(parseCoordinates("-3.0, 200.0")).toBeNull();
    expect(parseCoordinates("0, 0")).toBeNull();
  });

  it("does not mistake a house number or price for a pin", () => {
    expect(parseCoordinates("Plot 12, Kilifi")).toBeNull();
    expect(parseCoordinates("2,500")).toBeNull();
  });

  it("builds a tappable maps link", () => {
    expect(mapsUrl({ lat: -3.34, lng: 40.01 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=-3.34,40.01",
    );
  });
});
