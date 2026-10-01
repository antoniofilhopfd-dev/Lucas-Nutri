import { describe, it, expect } from "vitest";
import { buildAlerts, sortAlerts } from "./alerts";
import { change, movingAverage } from "./series";
const now = new Date("2026-10-10T12:00:00Z");
const h = (n: number) => new Date(now.getTime() - n * 3.6e6);
describe("alertas", () => {
  it("48 h e 96 h", () => {
    expect(buildAlerts({ id: "1", name: "A", lastRecordAt: h(50), adherence7d: 80 }, now)[0].code).toBe("no_record_48h");
    expect(buildAlerts({ id: "1", name: "A", lastRecordAt: h(100), adherence7d: 80 }, now)[0].severity).toBe("critical");
    expect(buildAlerts({ id: "1", name: "A", lastRecordAt: h(10), adherence7d: 80 }, now)).toEqual([]);
    expect(buildAlerts({ id: "1", name: "A", lastRecordAt: null, adherence7d: null }, now)[0].code).toBe("no_record_96h");
  });
  it("adesão baixa e queda", () => {
    const codes = buildAlerts({ id: "1", name: "A", lastRecordAt: h(1), adherence7d: 40, previousAdherence7d: 80 }, now).map((a) => a.code);
    expect(codes).toEqual(["low_adherence", "adherence_drop"]);
  });
  it("retorno atrasado e ordenação por gravidade", () => {
    const a = [...buildAlerts({ id: "1", name: "A", lastRecordAt: h(1), adherence7d: 90, nextReturn: h(48) }, now), ...buildAlerts({ id: "2", name: "B", lastRecordAt: h(120), adherence7d: 90 }, now)];
    expect(sortAlerts(a)[0].severity).toBe("critical"); expect(a.some((x) => x.code === "overdue_return")).toBe(true);
  });
});
describe("séries", () => {
  const s = [{ date: "a", value: 68.4 }, { date: "b", value: 67.5 }, { date: "c", value: 66.9 }];
  it("variação", () => { const c = change(s)!; expect(c.abs).toBeCloseTo(-1.5, 10); expect(c.pct).toBeCloseTo(-2.193, 2); expect(change([s[0]])).toBeNull(); });
  it("média móvel", () => { expect(movingAverage(s, 2)[1].value).toBeCloseTo(67.95, 10); expect(movingAverage(s, 1)).toEqual(s); expect(() => movingAverage(s, 0)).toThrow(); });
});
