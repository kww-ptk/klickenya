import { describe, it, expect } from "vitest";
import {
  ORDER_TRANSITIONS,
  canDriveTransition,
  isTransitionAllowed,
  nextAction,
} from "@/lib/orders/transitions";

describe("order transitions", () => {
  it("lists only forward moves", () => {
    expect(ORDER_TRANSITIONS.new).toEqual(["preparing", "cancelled"]);
    expect(isTransitionAllowed("ready", "delivered")).toBe(true);
    expect(isTransitionAllowed("delivered", "ready")).toBe(false);
    expect(isTransitionAllowed("cancelled", "new")).toBe(false);
    expect(isTransitionAllowed("new", "ready")).toBe(false);
  });

  it("lets the delivery station drive an order, like kitchen and manager", () => {
    expect(canDriveTransition({ type: "staff", role: "delivery" }, "new", "preparing")).toBe(true);
    expect(canDriveTransition({ type: "staff", role: "kitchen" }, "preparing", "ready")).toBe(true);
    expect(canDriveTransition({ type: "staff", role: "bar" }, "new", "cancelled")).toBe(true);
    expect(canDriveTransition({ type: "owner" }, "preparing", "ready")).toBe(true);
  });

  it("limits waiters and cashiers to completing a ready order", () => {
    expect(canDriveTransition({ type: "staff", role: "waiter" }, "new", "preparing")).toBe(false);
    expect(canDriveTransition({ type: "staff", role: "cashier" }, "ready", "cancelled")).toBe(false);
    expect(canDriveTransition({ type: "staff", role: "waiter" }, "ready", "delivered")).toBe(true);
  });

  it("names the next action for the queue button", () => {
    expect(nextAction("new")).toEqual({ to: "preparing", label: "Start preparing" });
    expect(nextAction("ready")).toEqual({ to: "delivered", label: "Complete" });
    expect(nextAction("delivered")).toBeNull();
    expect(nextAction("cancelled")).toBeNull();
  });
});
