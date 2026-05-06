// Parses Wellness Scan Co Test Report PDFs (raw scanner output) into structured data.
//
// pdf-parse v2 produces text with two co-existing layouts within the same PDF:
//
// SECTION HEADERS:
//   "(System Name) Analysis Report Card"          ← single-line (most common)
//   "(System Name)\nAnalysis Report Card"          ← two-line (some sections)
//
// MARKER ROWS:
//   "Blood Viscosity 48.264 -\n65.371 61.706"      ← split across 2 lines
//   "Detoxification Function 0.202 - 0.991\t0.903" ← all on one line
//   "Energy Production\nFunction 0.713 - 0.992\t0.753" ← name wraps to 2 lines
//   "Myocardial Blood Perfusion\nVolume\n4.832 -\n5.147 5.101" ← name wraps + range splits
//
// Strategy:
//   1. Section by header detection (handle both one-line and two-line formats)
//   2. Within each section, merge any line ending in " -" with the next line
//      so every marker row has the full "min - max value" tuple on a single line
//   3. Walk merged lines: a line matching "(name)? <num> - <num>\s+<num>" is a marker;
//      anything else is a name fragment to accumulate for the next marker

import { isDashboardSystem } from "./systemCatalog";

export interface ParsedMarker {
  name: string;
  rangeMin: number;
  rangeMax: number;
  value: number;
  inRange: boolean;
  /** Negative = below range, positive = above range. Normalized by range span. */
  deviation: number;
}

export interface ParsedSystem {
  name: string;
  markers: ParsedMarker[];
  percentNormal: number;
  status: "green" | "yellow" | "blue" | "red";
}

export interface ParsedScan {
  client: { name: string; age: number; sex?: string };
  scanDate: string; // ISO YYYY-MM-DD
  scanDateLocale: string; // M/D/YYYY (as printed)
  systems: ParsedSystem[];
  totalMarkers: number;
  markersInRange: number;
}

const NUM = "-?\\d+(?:\\.\\d+)?";
// Matches "<name?> <min> - <max> <value>" anywhere a complete range+value is on one line.
const FULL_ROW_RE = new RegExp(
  `^(.*?)(${NUM})\\s*-\\s*(${NUM})\\s+(${NUM})\\s*$`,
);

function computeStatus(percentNormal: number): ParsedSystem["status"] {
  if (percentNormal >= 90) return "green";
  if (percentNormal >= 70) return "blue";
  if (percentNormal >= 40) return "yellow";
  return "red";
}

/** Section by detecting either header layout. */
function splitSections(text: string): { system: string; lines: string[] }[] {
  const lines = text.split(/\r?\n/);
  const sections: { system: string; lines: string[] }[] = [];
  let current: { system: string; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Single-line: "(Name) Analysis Report Card"
    let m = line.match(/^\((.+?)\)\s+Analysis Report Card\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { system: m[1], lines: [] };
      continue;
    }

    // Two-line: "(Name)" / "Analysis Report Card"
    m = line.match(/^\((.+?)\)\s*$/);
    if (m && /^Analysis Report Card\s*$/.test(lines[i + 1] ?? "")) {
      if (current) sections.push(current);
      current = { system: m[1], lines: [] };
      i++; // skip the "Analysis Report Card" line
      continue;
    }

    if (current) current.lines.push(line);
  }
  if (current) sections.push(current);
  return sections;
}

/** Merge any line ending in " -" with the following non-empty line.
 *  Result: each marker row has its full "min - max value" tuple on one line. */
function joinDashLines(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    while (/\S+\s*-\s*$/.test(line) && i + 1 < lines.length) {
      // Find the next non-empty line
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j >= lines.length) break;
      const next = lines[j].trim();
      line = line.replace(/\s*-\s*$/, " - ") + next;
      i = j;
    }
    out.push(line);
    i++;
  }
  return out;
}

function extractMarkers(sectionLines: string[]): ParsedMarker[] {
  // Cut at "Reference Standard:" — anything below is the threshold table, not markers.
  const stop = sectionLines.findIndex((l) =>
    /Reference Standard:?/i.test(l),
  );
  const body = stop >= 0 ? sectionLines.slice(0, stop) : sectionLines;

  // Skip the column-header preamble (ends at the line containing "Testing Result")
  const dataStart = body.findIndex((l) => /\bTesting Result\b/.test(l));
  const dataLines = dataStart >= 0 ? body.slice(dataStart + 1) : body;

  // Merge dash-terminated lines with their follow-on
  const merged = joinDashLines(dataLines);

  const markers: ParsedMarker[] = [];
  let nameAccum: string[] = [];

  for (const rawLine of merged) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip page footers / repeating "Test Report" / repeated section headers
    if (
      /^Page\s+\d+/i.test(line) ||
      /^-+\s*\d+\s+of\s+\d+\s*-+$/.test(line) ||
      /^Test Report\s*$/i.test(line) ||
      /^\(.+\)\s*(?:Analysis Report Card)?\s*$/.test(line) ||
      /^Analysis Report Card\s*$/.test(line) ||
      /^Actual Testing Results\s*$/i.test(line) ||
      /^Name:\s/.test(line) ||
      /^Figure:\s/.test(line)
    ) {
      continue;
    }

    const m = line.match(FULL_ROW_RE);
    if (m) {
      const namePart = m[1].replace(/[\t\s]+$/g, "").trim();
      const min = parseFloat(m[2]);
      const max = parseFloat(m[3]);
      const value = parseFloat(m[4]);

      // Sanity: a valid range has min < max. If they're equal or inverted,
      // this is probably not a real marker row.
      if (max <= min) {
        // Treat as name fragment instead
        nameAccum.push(line);
        continue;
      }

      const fullName =
        [...nameAccum, namePart]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      if (fullName) {
        const inRange = value >= min && value <= max;
        const span = max - min || 1;
        const deviation =
          value < min
            ? (value - min) / span
            : value > max
              ? (value - max) / span
              : 0;
        markers.push({
          name: fullName,
          rangeMin: min,
          rangeMax: max,
          value,
          inRange,
          deviation,
        });
      }
      nameAccum = [];
    } else {
      nameAccum.push(line);
    }
  }

  return markers;
}

function extractClientInfo(text: string): {
  name: string;
  age: number;
  sex?: string;
  scanDate: string;
} {
  // pdf-parse v2 output: "Name: Angela Holter \tSex: Female \tAge: 53"
  const nameMatch = text.match(
    /Name:\s*([^\t\r\n]+?)(?=\s*\t|\s+Sex:|\s+Age:|\s*\r?\n)/,
  );
  const ageMatch = text.match(/Age:\s+(\d+)/);
  const sexMatch = text.match(/Sex:\s+(\w+)/);
  const dateMatch = text.match(/Testing Time:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  return {
    name: nameMatch?.[1]?.trim() ?? "Unknown",
    age: ageMatch ? parseInt(ageMatch[1], 10) : 0,
    sex: sexMatch?.[1],
    scanDate: dateMatch?.[1] ?? "",
  };
}

export function parseScan(text: string): ParsedScan {
  const client = extractClientInfo(text);

  let isoDate = "";
  if (client.scanDate) {
    const [m, d, y] = client.scanDate.split("/");
    isoDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const sections = splitSections(text);
  const systems: ParsedSystem[] = [];
  let totalMarkers = 0;
  let markersInRange = 0;

  for (const { system: rawName, lines } of sections) {
    if (!isDashboardSystem(rawName)) continue;

    const markers = extractMarkers(lines);
    if (markers.length === 0) continue;

    const inRangeCount = markers.filter((m) => m.inRange).length;
    const percentNormal = (inRangeCount / markers.length) * 100;

    systems.push({
      name: rawName,
      markers,
      percentNormal,
      status: computeStatus(percentNormal),
    });

    totalMarkers += markers.length;
    markersInRange += inRangeCount;
  }

  return {
    client: {
      name: client.name,
      age: client.age,
      sex: client.sex,
    },
    scanDate: isoDate,
    scanDateLocale: client.scanDate,
    systems,
    totalMarkers,
    markersInRange,
  };
}
