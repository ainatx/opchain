import { describe, expect, it } from "vitest";
import { FEATURES, FEATURE_GROUPS, PLATFORMS, SOURCES, FIXED_ORDER, SELECTABLE, PRESETS, MAX_EXTRAS } from "../site/src/data/comparison.ts";

describe("comparison evidence contract", () => {
  it("covers each dimension exactly once with evidence for every platform", () => {
    const features = FEATURES.map(({ id }) => id);
    expect(new Set(features).size).toBe(features.length);
    expect(FEATURE_GROUPS.flatMap(({ featureIds }) => featureIds).sort()).toEqual([...features].sort());
    for (const platform of Object.values(PLATFORMS)) {
      expect(Object.keys(platform.cells).sort(), platform.name).toEqual([...features].sort());
      for (const cell of Object.values(platform.cells)) {
        expect(cell.v.trim()).not.toBe("");
        expect(cell.sources.length).toBeGreaterThan(0);
        for (const id of cell.sources) expect(SOURCES[id], `${platform.name}: ${id}`).toBeDefined();
      }
    }
  });
  it("uses safe, named, uniquely numbered sources and valid selections", () => {
    const sources = Object.values(SOURCES);
    expect(new Set(sources.map(({ number }) => number)).size).toBe(sources.length);
    for (const source of sources) {
      expect(source.title.trim()).not.toBe("");
      expect(source.url).toMatch(/^(https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/);
    }
    expect(new Set([...FIXED_ORDER, ...SELECTABLE]).size).toBe(Object.keys(PLATFORMS).length);
    for (const ids of Object.values(PRESETS)) {
      expect(ids.length).toBeLessThanOrEqual(MAX_EXTRAS);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(SELECTABLE).toContain(id);
    }
  });
});
