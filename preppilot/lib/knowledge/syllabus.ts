import syllabusKb from "./syllabus-kb.json";
import type { StudentClass, TargetExam } from "@/lib/db/schema";

type SyllabusSubject = {
  name: string;
  units: string[];
};

type SyllabusTrack = {
  id: string;
  exams: TargetExam[];
  classes: StudentClass[];
  subjects: SyllabusSubject[];
};

type SyllabusKb = {
  version: number;
  generatedAt: string;
  tracks: SyllabusTrack[];
};

type SyllabusProfile = {
  class: StudentClass;
  targetExam: readonly TargetExam[];
};

export type SyllabusCoverage =
  | { status: "covered"; matchedUnits: string[] }
  | { status: "out_of_syllabus"; matchedUnits: []; reason: string }
  | { status: "unknown"; matchedUnits: []; reason: string };

const kb = syllabusKb as SyllabusKb;

const TOPIC_CUE_REGEX =
  /\b(topic|chapter|unit|syllabus|plan|planner|revision|revise|schedule|roadmap|study)\b/i;

const STOPWORDS = new Set([
  "unit",
  "and",
  "the",
  "for",
  "with",
  "from",
  "its",
  "their",
  "into",
  "related",
  "some",
  "basic",
  "main",
  "part",
  "paper",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(subject: string): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

function stripUnitPrefix(unit: string): string {
  return unit.replace(/^unit\s+[0-9ivxlc]+\s*:\s*/i, "").trim();
}

function tracksForProfile(profile: SyllabusProfile): SyllabusTrack[] {
  return kb.tracks.filter((track) => {
    const classMatch = track.classes.includes(profile.class);
    const examMatch = track.exams.some((exam) => profile.targetExam.includes(exam));
    return classMatch && examMatch;
  });
}

function subjectsForProfile(profile: SyllabusProfile): SyllabusSubject[] {
  const merged = new Map<string, Set<string>>();

  for (const track of tracksForProfile(profile)) {
    for (const subject of track.subjects) {
      if (!merged.has(subject.name)) {
        merged.set(subject.name, new Set());
      }
      const units = merged.get(subject.name);
      if (!units) continue;
      for (const unit of subject.units) {
        units.add(unit);
      }
    }
  }

  return Array.from(merged.entries()).map(([name, units]) => ({
    name,
    units: Array.from(units),
  }));
}

function unitTerms(unit: string): string[] {
  const stripped = stripUnitPrefix(unit);
  const normalized = normalize(stripped);
  const terms = new Set<string>();
  if (normalized) terms.add(normalized);

  for (const token of normalized.split(" ")) {
    if (token.length < 5 || STOPWORDS.has(token)) continue;
    terms.add(token);
  }

  return Array.from(terms);
}

export function buildSyllabusPromptSection(profile: SyllabusProfile): string {
  const subjects = subjectsForProfile(profile);
  if (subjects.length === 0) {
    return `SYLLABUS KNOWLEDGE BASE
- No syllabus data loaded for this student's class/exam combination.
- Do not invent chapter-level plans when syllabus is unavailable.
- Ask the user to specify exam + subject focus and keep advice at high-level strategy only.`;
  }

  const lines: string[] = [];
  lines.push("SYLLABUS KNOWLEDGE BASE (STRICT BOUNDARY)");
  lines.push("- Plan only within the units listed below.");
  lines.push("- If the student asks for a topic outside these units, say it is outside the loaded syllabus and ask for an in-syllabus alternative.");
  lines.push("- Never add extra chapters/units not present here.");
  lines.push("");

  for (const subject of subjects) {
    lines.push(`### ${titleCase(subject.name)}`);
    for (const unit of subject.units) {
      lines.push(`- ${unit}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function assessSyllabusCoverage(message: string, profile: SyllabusProfile): SyllabusCoverage {
  const subjects = subjectsForProfile(profile);
  if (subjects.length === 0) {
    return { status: "unknown", matchedUnits: [], reason: "no syllabus loaded for profile" };
  }

  const normalizedMessage = normalize(message);
  if (!normalizedMessage) return { status: "covered", matchedUnits: [] };

  const matched = new Set<string>();
  for (const subject of subjects) {
    for (const unit of subject.units) {
      const terms = unitTerms(unit);
      if (terms.some((term) => term.length >= 5 && normalizedMessage.includes(term))) {
        matched.add(unit);
      }
    }
  }

  if (matched.size > 0) {
    return { status: "covered", matchedUnits: Array.from(matched) };
  }

  if (!TOPIC_CUE_REGEX.test(normalizedMessage)) {
    // Generic planning requests without explicit chapter mentions are allowed.
    return { status: "covered", matchedUnits: [] };
  }

  return {
    status: "out_of_syllabus",
    matchedUnits: [],
    reason: "no matching syllabus unit found in request",
  };
}

export function buildOutOfSyllabusMessage(profile: SyllabusProfile): string {
  const subjects = subjectsForProfile(profile);
  if (subjects.length === 0) {
    return "I can only create chapter-level plans after the syllabus knowledge base is loaded for your exam. Right now it's unavailable, so I can help with a high-level study strategy only.";
  }

  const preview = subjects
    .map((subject) => {
      const sample = subject.units.slice(0, 4).map((u) => stripUnitPrefix(u)).join("; ");
      return `- ${titleCase(subject.name)}: ${sample}`;
    })
    .join("\n");

  return `That topic does not match the loaded syllabus knowledge base for your selected exam(s). I can only plan inside syllabus-listed units.\n\nTry with one of these unit groups:\n${preview}`;
}
