import { describe, it, expect } from "vitest";
import { deliveryStage } from "@/lib/orders/deliveryStage";

const t = "2026-09-14T10:00:00Z";

describe("deliveryStage", () => {
  it("follows the status while nobody has the food", () => {
    expect(deliveryStage({ status: "new" })).toBe("waiting");
    expect(deliveryStage({ status: "preparing" })).toBe("cooking");
    expect(deliveryStage({ status: "ready" })).toBe("awaiting_rider");
  });

  it("knows a rider is coming once they accept, whatever the kitchen is doing", () => {
    expect(deliveryStage({ status: "preparing", rider_accepted_at: t })).toBe("rider_assigned");
    expect(deliveryStage({ status: "ready", rider_accepted_at: t })).toBe("rider_assigned");
  });

  it("is on its way only after pickup", () => {
    expect(deliveryStage({ status: "ready", rider_accepted_at: t, picked_up_at: t })).toBe(
      "out_for_delivery",
    );
    expect(deliveryStage({ status: "ready", rider_accepted_at: t })).not.toBe("out_for_delivery");
  });

  it("terminal statuses win over timestamps", () => {
    expect(deliveryStage({ status: "delivered", picked_up_at: t })).toBe("delivered");
    expect(deliveryStage({ status: "cancelled", rider_accepted_at: t, picked_up_at: t })).toBe(
      "cancelled",
    );
  });
});
