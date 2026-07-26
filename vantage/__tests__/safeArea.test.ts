import { safeTop, safeBottom } from "../lib/safeArea";

const insets = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 0 });

describe("safe-area padding", () => {
  it("adds the design gap to a real device inset", () => {
    expect(safeTop(insets(47, 34), 20, 64)).toBe(67); // notch: 47 + 20
    expect(safeBottom(insets(47, 34), 12, 30)).toBe(46); // home indicator: 34 + 12
  });

  it("falls back to the fixed web value when there is no inset", () => {
    expect(safeTop(insets(0, 0), 20, 64)).toBe(64);
    expect(safeBottom(insets(0, 0), 12, 30)).toBe(30);
  });
});
