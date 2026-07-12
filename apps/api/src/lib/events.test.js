import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { domainEvents } from "./events.js";

describe("domainEvents", () => {
  it("EventEmitter nusxasi bo'ladi", () => {
    expect(domainEvents).toBeInstanceOf(EventEmitter);
  });

  it("emit qilingan hodisani tinglovchilarga yetkazadi", () => {
    const listener = vi.fn();
    domainEvents.on("test.event", listener);

    domainEvents.emit("test.event", { foo: "bar" });

    expect(listener).toHaveBeenCalledWith({ foo: "bar" });
    domainEvents.off("test.event", listener);
  });
});
