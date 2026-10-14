import type { ParsedScan } from "../parser/parseScan";

export interface GuideSystem {
  name: string;
  current: number;
  previous: number | null;
  inRange: number;
  total: number;
  closer: number;
  farther: number;
}
export interface GuideContent {
  version: 1;
  scanDate: string;
  previousDate: string | null;
  text: string;
  focus: string;
  systems: GuideSystem[];
  warnings: string[];
}

const percent = (n: number) => Number(n.toFixed(1));
const distance = (value: number, min: number, max: number) =>
  value < min ? min - value : value > max ? value - max : 0;

/** Deliberately uses a small approved template library, not an external model.
 * Numeric calculations stay deterministic and the original dashboard is untouched. */
export function draftGuide(current: ParsedScan, previous?: ParsedScan): GuideContent {
  if (!current.scanDate || !current.systems.length) throw new Error("A dated scan with systems is required.");
  if (previous && previous.scanDate >= current.scanDate) throw new Error("The previous scan must be earlier.");
  const prior = new Map(previous?.systems.map(s => [s.name, s]) ?? []);
  const warnings: string[] = [];
  const systems = current.systems.map(system => {
    if (!system.markers.length) throw new Error("Empty system: " + system.name);
    const names = new Set<string>();
    for (const m of system.markers) {
      if (names.has(m.name) || ![m.value, m.rangeMin, m.rangeMax].every(Number.isFinite) || m.rangeMax <= m.rangeMin)
        throw new Error("Invalid or duplicate marker in " + system.name);
      names.add(m.name);
    }
    const base = prior.get(system.name);
    // A comparison is supported only by the same marker names and ranges.
    const baseMarkers = new Map(base?.markers.map(m => [m.name, m]) ?? []);
    const matched = !!base && baseMarkers.size === base.markers.length && base.markers.length === system.markers.length &&
      system.markers.every(m => {
        const b = baseMarkers.get(m.name);
        return b && Number.isFinite(b.value) && b.rangeMin === m.rangeMin && b.rangeMax === m.rangeMax;
      });
    if (previous && !matched) warnings.push(system.name + ": marker coverage or reference ranges changed; no trend calculated.");
    let closer = 0, farther = 0;
    for (const m of system.markers) {
      const b = matched ? baseMarkers.get(m.name) : undefined;
      if (!b) continue;
      const before = distance(b.value, m.rangeMin, m.rangeMax);
      const now = distance(m.value, m.rangeMin, m.rangeMax);
      if (before > 0 && now < before) closer++;
      if (now > before) farther++;
    }
    const inRange = system.markers.filter(m => distance(m.value, m.rangeMin, m.rangeMax) === 0).length;
    return {
      name: system.name, current: percent(inRange / system.markers.length * 100),
      previous: matched ? percent(base!.markers.filter(m => distance(m.value, m.rangeMin, m.rangeMax) === 0).length / base!.markers.length * 100) : null,
      inRange, total: system.markers.length, closer, farther,
    };
  });
  if (new Set(systems.map(s => s.name)).size !== systems.length) throw new Error("Duplicate systems in the scan.");
  const lines: string[] = [];
  if (!previous) {
    lines.push("This is your starting point. These percentages show how many markers are within the scan's reference ranges; they do not measure how much an organ is functioning.");
    const priorities = [...systems].sort((a, b) => a.current - b.current).slice(0, 3);
    lines.push("Areas to discuss together: " + priorities.map(s => s.name + " (" + s.current + "%; " + s.inRange + " of " + s.total + " markers in range)").join(", ") + ".");
  } else {
    const comparable = systems.filter(s => s.previous !== null);
    if (!comparable.length) throw new Error("No comparable systems. Review the source reports before generating a summary.");
    const ups = comparable.filter(s => s.current > s.previous!);
    const dips = comparable.filter(s => s.current < s.previous!);
    const same = comparable.filter(s => s.current === s.previous!);
    lines.push("Since your scan on " + previous.scanDate + ", " + ups.length + " system scores rose, " + dips.length + " dipped, and " + same.length + " stayed the same. Scores describe markers within the scan's reference ranges, not organ function.");
    const biggest = [...comparable].sort((a, b) => Math.abs(b.current - b.previous!) - Math.abs(a.current - a.previous!)).slice(0, 5);
    for (const s of biggest) {
      const delta = s.current - s.previous!;
      lines.push((delta > 0 ? "This is great! " : "") + s.name + ": " + s.previous + "% to " + s.current + "% - " + (delta > 0 ? "more markers are in range." : delta < 0 ? "fewer markers are in range this time; let's discuss it together." : "the share of markers in range is unchanged."));
    }
    const closer = comparable.reduce((sum, s) => sum + s.closer, 0);
    const farther = comparable.reduce((sum, s) => sum + s.farther, 0);
    lines.push("Across comparable markers, " + closer + " moved closer to or entered their reference ranges; " + farther + " moved farther away or left their ranges. This is separate from the percentage in range.");
    if (previous.systems.some(s => !systems.some(c => c.name === s.name))) warnings.push("Some systems from the previous scan are absent from this scan.");
  }
  lines.push("We'll review how you're feeling and agree on your next focus together. These scan changes alone do not establish a diagnosis or show what caused a change.");
  return { version: 1, scanDate: current.scanDate, previousDate: previous?.scanDate ?? null, text: lines.join("\n\n"), focus: "", systems, warnings };
}
