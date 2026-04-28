import { describe, it, expect } from "vitest";
import { VectorStore } from "@/lib/rag/vector-store";

describe("VectorStore", () => {
  it("should add entries and return size", () => {
    const store = new VectorStore();
    store.add("1", [1, 0, 0], { title: "Test" });
    store.add("2", [0, 1, 0], { title: "Test2" });
    expect(store.size).toBe(2);
  });

  it("should find most similar vectors", () => {
    const store = new VectorStore();
    store.add("1", [1, 0, 0], { title: "A" });
    store.add("2", [0, 1, 0], { title: "B" });
    store.add("3", [0, 0, 1], { title: "C" });

    // Query close to [1,0,0] should return "1" as top result
    const results = store.search([0.9, 0.1, 0], 2);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("1");
    expect(results[0].score).toBeGreaterThan(0.9);
  });

  it("should respect topK parameter", () => {
    const store = new VectorStore();
    for (let i = 0; i < 10; i++) {
      store.add(String(i), [Math.random(), Math.random(), Math.random()], {});
    }
    const results = store.search([1, 0, 0], 3);
    expect(results).toHaveLength(3);
  });

  it("should return empty for empty store", () => {
    const store = new VectorStore();
    const results = store.search([1, 0, 0], 5);
    expect(results).toHaveLength(0);
  });

  it("should sort by descending similarity", () => {
    const store = new VectorStore();
    store.add("far", [0, 0, 1], {});
    store.add("mid", [0.5, 0.5, 0], {});
    store.add("close", [1, 0, 0], {});

    const results = store.search([1, 0, 0], 3);
    expect(results[0].id).toBe("close");
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it("should clear all entries", () => {
    const store = new VectorStore();
    store.add("1", [1, 0], {});
    store.clear();
    expect(store.size).toBe(0);
  });
});
