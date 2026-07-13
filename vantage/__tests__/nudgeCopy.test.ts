import { nudgeCopy } from "../lib/nudgeCopy";
import { tonightNudge } from "../lib/nudge";

const CAM = "fuji-x100vi";
const KIT = ["sony-fe35-18"];

function copyOn(day: number) {
  const now = new Date(2026, 6, day, 19, 0, 0);
  return nudgeCopy(tonightNudge(now, CAM, KIT), "35mm", now);
}

describe("nudgeCopy", () => {
  test("produces a non-empty title and body", () => {
    const c = copyOn(13);
    expect(c.title.length).toBeGreaterThan(0);
    expect(c.body.length).toBeGreaterThan(0);
  });

  test("is deterministic for a given day (no jitter on re-render)", () => {
    expect(copyOn(13)).toEqual(copyOn(13));
  });

  test("varies across days (fresh phrasing, not the same canned line)", () => {
    const titles = new Set([copyOn(10).title, copyOn(11).title, copyOn(12).title, copyOn(13).title]);
    expect(titles.size).toBeGreaterThan(1);
  });

  test("weaves in the pick, the lens, and a time on a go night", () => {
    const now = new Date(2026, 6, 13, 19, 0, 0);
    const v = tonightNudge(now, CAM, KIT);
    const c = nudgeCopy(v, "35mm", now);
    if (v.go) {
      expect(c.body).toContain(v.spot.name);
      expect(c.body).toContain("35mm");
      expect(c.body).toMatch(/\d{1,2}:\d{2}/); // a clock time
    }
  });
});
