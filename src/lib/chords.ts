const sharpNotes = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
const flatNotes = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

const noteIndexes: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const chordPattern = /^([A-G])([#b]?)([^/\s{}]*)(?:\/([A-G])([#b]?))?$/;

function noteIndex(note: string): number | null {
  const match = note.trim().match(/^([A-Ga-g])([#b]?)/);
  if (!match) return null;
  return noteIndexes[`${match[1].toUpperCase()}${match[2]}`] ?? null;
}

function transposeNote(
  note: string,
  steps: number,
  preferFlats: boolean,
): string {
  const index = noteIndex(note);
  if (index == null) return note;
  const notes = preferFlats ? flatNotes : sharpNotes;
  return notes[(index + (steps % 12) + 12) % 12];
}

export function transposeChord(
  chord: string,
  steps: number,
  preferFlats = false,
): string {
  const match = chord.trim().match(chordPattern);
  if (!match) return chord;
  const [, root, accidental, suffix, bassRoot, bassAccidental] = match;
  const rootNote = transposeNote(
    `${root}${accidental}`,
    steps,
    preferFlats || accidental === "b",
  );
  const bass = bassRoot
    ? `/${transposeNote(`${bassRoot}${bassAccidental}`, steps, preferFlats || bassAccidental === "b")}`
    : "";
  return `${rootNote}${suffix}${bass}`;
}

export function transposeSteps(fromKey: string, toKey: string): number {
  const from = noteIndex(fromKey);
  const to = noteIndex(toKey);
  if (from == null || to == null) return 0;
  return (to - from + 12) % 12;
}

export function transposeKey(
  key: string,
  steps: number,
  preferFlats = false,
): string {
  const match = key.trim().match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!match) return key;
  return `${transposeNote(`${match[1].toUpperCase()}${match[2]}`, steps, preferFlats || match[2] === "b")}${match[3]}`;
}
