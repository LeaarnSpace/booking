import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasUnpublishedChanges } from "./client.ts";
import { isRoleCode, newRoleCode } from "./code.ts";
import { moveInList } from "./order.ts";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("moveInList", () => {
  it("swaps with the neighbour and renumbers from 1", () => {
    assert.deepEqual(moveInList(items, "b", "up"), [
      { id: "b", sortOrder: 1 },
      { id: "a", sortOrder: 2 },
      { id: "c", sortOrder: 3 },
    ]);
    assert.deepEqual(
      moveInList(items, "b", "down")?.map((i) => i.id),
      ["a", "c", "b"],
    );
  });

  it("does nothing past either end, or for an unknown item", () => {
    assert.equal(moveInList(items, "a", "up"), null);
    assert.equal(moveInList(items, "c", "down"), null);
    assert.equal(moveInList(items, "x", "up"), null);
  });
});

describe("hasUnpublishedChanges", () => {
  const at = (s: string) => new Date(`2026-11-03T${s}:00Z`);
  const base = { changedBy: null, publishedBy: null, publishError: null };

  it("is true when content changed after the last publish, or was never published", () => {
    assert.equal(hasUnpublishedChanges({ ...base, changedAt: at("10:00"), publishedAt: at("09:00") }), true);
    assert.equal(hasUnpublishedChanges({ ...base, changedAt: at("10:00"), publishedAt: null }), true);
  });

  it("is false when nothing changed since the last publish", () => {
    assert.equal(hasUnpublishedChanges({ ...base, changedAt: at("09:00"), publishedAt: at("10:00") }), false);
    assert.equal(hasUnpublishedChanges({ ...base, changedAt: null, publishedAt: null }), false);
  });
});

describe("role codes", () => {
  it("are 10 letters and digits that can't be confused, different each time", () => {
    const codes = new Set(Array.from({ length: 200 }, newRoleCode));
    assert.equal(codes.size, 200);
    for (const c of codes) assert.ok(isRoleCode(c), c);
    assert.equal(isRoleCode("k7f3q9xm2a"), true);
    assert.equal(isRoleCode("k7f3q9xm2o"), false);
    assert.equal(isRoleCode("../admin"), false);
  });
});
