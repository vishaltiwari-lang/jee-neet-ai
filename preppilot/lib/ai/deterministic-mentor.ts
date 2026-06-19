import type { IntentLabel } from "@/lib/db/schema";
import type { StudentProfile } from "@/lib/services/profile";
import { HELPLINE_MESSAGE, OUT_OF_SCOPE_MESSAGE, REFUSAL_MESSAGE } from "./refusal";
import { looksLikeInjection } from "./safety";

type DeterministicMentorInput = {
  message: string;
  profile?: StudentProfile | null;
  intent?: IntentLabel;
  isSelfHarm?: boolean;
};

type DeterministicMentorResponse = {
  text: string;
  label: IntentLabel;
};

const PLAN_PATTERN =
  /\b(plan|schedule|timetable|routine|roadmap|calendar|week|month|revise|revision|backlog|complete|cover|last\s+\d+\s+(days|weeks|months))\b/i;
const MOTIVATION_PATTERN =
  /\b(stress|stressed|anxious|anxiety|panic|burnout|burned\s*out|demotivated|motivat|scared|fear|confidence|overwhelmed|tired|pressure|lazy|procrastinat)\b/i;
const STRATEGY_PATTERN =
  /\b(strategy|manage|balance|school|exam|mock|test|marks|negative|attempt|accuracy|speed|resource|book|chapter|subject|study|practice|focus|weak|strong|revision|jee|neet|rank|percentile)\b/i;
const CLARIFICATION_PATTERN = /\b(what do you mean|explain again|clarify|more detail|can you elaborate)\b/i;
const OUT_OF_SCOPE_PATTERN =
  /\b(recipe|movie|song|cricket|football|weather|stock|crypto|coding|programming|javascript|python|relationship|dating|travel|hotel)\b/i;
const BOOK_RECOMMENDATION_PATTERN =
  /\b(which|what|suggest|recommend|buy|purchase|follow|choose)\b.{0,60}\b(book|books|module|modules|material|resources?|publication|publications)\b|\b(book|books|module|modules|material|resources?|publication|publications)\b.{0,60}\b(which|what|suggest|recommend|buy|purchase|follow|choose)\b/i;

const DIRECT_SOLVE_PATTERNS: RegExp[] = [
  /\b(find|calculate|compute|derive|prove|balance|integrate|differentiate|evaluate)\b.{0,100}\b(value|time|force|field|wavelength|pH|molarity|weight|product|ratio|area|dy\/dx|equation|formula|answer|acceleration|velocity|current|voltage)\b/i,
  /\b(solve|calculate|compute|find|derive|prove|balance|differentiate|integrate|evaluate|simplify)\b.{0,80}\b(this|question|problem|numerical|equation|mcq|value|answer|option|ratio|pH|molarity|product)\b/i,
  /\b(answer|ans|solution|working|steps)\b.{0,40}\b(to|for|of)\b/i,
  /\b(which|choose)\b.{0,40}\b(option|correct|following)\b/i,
  /\bmajor product\b/i,
  /\bphenotypic ratio\b/i,
  /\bchromosomes?\b.{0,40}\b(how many|number)\b/i,
  /\b[A-Da-d]\)\s*[^)\n]+(?:\s+[A-Da-d]\)\s*[^)\n]+){1,}/,
  /(?:^|\s)[a-z]\s*[=^]\s*[-+]?\d/i,
  /\d+\s*(?:\+|-|\*|\/|\^|=)\s*\d+/,
];

const SOLVE_AS_STRATEGY_PATTERN =
  /\b(how\s+(do|should|can)\s+i\s+(solve|approach|practice|improve)|how\s+(do|should|can)\s+i\s+(find|make)\s+time|on my own|without affecting|without disturbing|manage|balance|strategy|plan|method|practice loop)\b/i;

const CLASS_LABELS: Record<string, string> = {
  class_11: "Class 11",
  class_12: "Class 12",
  dropper: "Dropper",
};

const EXAM_LABELS: Record<string, string> = {
  jee_main: "JEE Main",
  jee_advanced: "JEE Advanced",
  neet: "NEET",
};

export function classifyIntentHeuristic(message: string): IntentLabel | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  if (looksLikeAcademicSolve(trimmed)) return "academic_solve";
  if (MOTIVATION_PATTERN.test(trimmed)) return "motivation";
  if (PLAN_PATTERN.test(trimmed)) return "plan_request";
  if (STRATEGY_PATTERN.test(trimmed)) return "strategy";
  if (CLARIFICATION_PATTERN.test(trimmed)) return "clarification";
  if (OUT_OF_SCOPE_PATTERN.test(trimmed)) return "out_of_scope";
  return null;
}

export function buildDeterministicMentorResponse(
  input: DeterministicMentorInput,
): DeterministicMentorResponse {
  const label = input.intent ?? classifyIntentHeuristic(input.message) ?? "strategy";
  let text: string;

  if (label === "academic_solve") {
    text = REFUSAL_MESSAGE;
  } else if (label === "out_of_scope") {
    text = OUT_OF_SCOPE_MESSAGE;
  } else if (isBookRecommendationRequest(input.message)) {
    text = buildBookRecommendationUnavailableResponse(input.profile);
  } else if (label === "motivation") {
    text = buildMotivationResponse(input.profile);
  } else if (label === "plan_request") {
    text = buildPlanResponse(input.message, input.profile);
  } else if (label === "clarification") {
    text = buildClarificationResponse(input.profile);
  } else {
    text = buildStrategyResponse(input.message, input.profile);
  }

  if (input.isSelfHarm) {
    text = `${HELPLINE_MESSAGE}\n\n---\n\n${text}`;
  }

  return { text, label };
}

export function isBookRecommendationRequest(message: string): boolean {
  return BOOK_RECOMMENDATION_PATTERN.test(message);
}

export function buildBookRecommendationUnavailableResponse(profile?: StudentProfile | null): string {
  return `${studentLine(profile)}I cannot fetch live Physics Wallah publication listings right now, so I will not invent book names, prices, or links.

For your numerical weakness, use a practice ladder instead of jumping between books:

1. Revise the formula sheet and 2 to 3 solved examples for the exact chapter.
2. Do only basic single-concept numericals first until accuracy becomes stable.
3. Move to mixed PYQ-style practice in short timed sets of 10 to 15 questions.
4. Keep an error log with three tags: concept gap, formula recall, calculation mistake.
5. Repeat only the wrong-question pattern the next day before starting new questions.

For buying material, check the official PW store/app for the current PW publication titles. Tell me your subject, chapter, and whether you are preparing for JEE Main or Advanced, and I will make you a chapter-wise practice plan.`;
}

function looksLikeAcademicSolve(message: string): boolean {
  if (SOLVE_AS_STRATEGY_PATTERN.test(message) && !hasSpecificQuestionShape(message)) {
    return false;
  }
  return looksLikeInjection(message) || DIRECT_SOLVE_PATTERNS.some((pattern) => pattern.test(message));
}

function hasSpecificQuestionShape(message: string): boolean {
  return (
    /\d+\s*(?:\+|-|\*|\/|\^|=)\s*\d+/.test(message) ||
    /\b[A-Da-d]\)\s*[^)\n]+(?:\s+[A-Da-d]\)\s*[^)\n]+){1,}/.test(message) ||
    /\b(find|calculate|compute|derive|prove|balance|integrate|differentiate)\b/i.test(message)
  );
}

function buildPlanResponse(message: string, profile?: StudentProfile | null): string {
  if (/\bschool\b/i.test(message) && /\b(jee|neet|prep|preparation|exam)\b/i.test(message)) {
    return `${studentLine(profile)}Use a two-track week instead of trying to study school and entrance prep as separate lives.

1. During normal school weeks, keep school work on a fixed daily maintenance block: revise today's class notes, finish school assignments, and mark overlap chapters.
2. Keep JEE/NEET alive every day with one compact high-quality block: concept recall, selected practice, and error review. Do not chase volume on heavy school days.
3. In the seven days before a school exam, let school take priority, but keep a small entrance-prep touchpoint so momentum does not break.
4. Use overlap aggressively. If school is doing mechanics, bonding, calculus, genetics, or any shared unit, treat that school revision as entrance revision too.
5. Every Sunday, choose only three targets for the week: one school target, one entrance target, and one backlog or mock-analysis target.

For today: list your next school exam, the chapter, and your weakest entrance subject. Then make tomorrow's plan around those three facts, not around a perfect timetable.`;
  }

  return `${studentLine(profile)}Build the plan around execution, not ambition.

1. Pick the exam window first: daily plan for the next three days, weekly plan for the next two weeks, and a light monthly direction.
2. Split each study day into concept revision, timed practice, and error-log repair. Skipping the error log is where most plans quietly fail.
3. Put weak chapters earlier in the day and familiar revision later.
4. Keep one buffer slot every week. If nothing slips, use it for mock analysis.
5. End each day by writing the next day's first task in one line.

Send me your available hours, target exam, and weakest two chapters, and I can turn this into a tighter timetable.`;
}

function buildStrategyResponse(message: string, profile?: StudentProfile | null): string {
  if (/\bschool\b/i.test(message) && /\b(jee|neet|prep|preparation|exam)\b/i.test(message)) {
    return buildPlanResponse(message, profile);
  }

  if (/\bmock|test|marks|negative|accuracy|speed\b/i.test(message)) {
    return `${studentLine(profile)}Treat mock tests as diagnosis, not judgement.

1. First separate mistakes into four buckets: concept gap, formula/NCERT recall, calculation or reading error, and time pressure.
2. Fix only the top two recurring buckets before the next mock. Trying to fix everything at once usually changes nothing.
3. Reattempt wrong and skipped questions after one day without looking at solutions first.
4. Keep an "avoid list" for silly mistakes. Read it for two minutes before every test.
5. Track accuracy subject-wise, not just total marks. Total score hides the real leak.

Your next useful move: analyze the last mock and write the three mistakes that cost the most marks.`;
  }

  if (/\bsubject|physics|chemistry|math|maths|biology|weak|strong|focus\b/i.test(message)) {
    return `${studentLine(profile)}Choose subject priority by marks leakage, not by mood.

1. Put the weakest high-weight subject first in the day.
2. Maintain strong subjects with shorter timed practice so they do not decay.
3. Use NCERT-first revision for Chemistry and Biology where applicable; use example-to-practice loops for Physics and Math.
4. Do not rotate all subjects equally if one subject is clearly pulling the score down.
5. Review errors twice: once immediately, once after three to four days.

If you tell me your latest mock split by subject, I can help rank what to attack first.`;
  }

  return `${studentLine(profile)}Here is the clean strategy: reduce the problem to one controllable weekly loop.

1. Decide the week's main target: score stability, backlog reduction, revision, or mock performance.
2. Give each day one primary chapter and one maintenance task.
3. Study in this order: recall basics, revise examples, do timed practice, then repair mistakes.
4. Keep phone-free starts. The first study block decides the tone of the day.
5. At night, write what changed because of today's study. If the answer is "nothing", the task was too passive.

For your current question, I would start with one practical constraint: what is the biggest thing currently stealing time - school work, backlog, weak concepts, or test anxiety?`;
}

function buildMotivationResponse(profile?: StudentProfile | null): string {
  return `${studentLine(profile)}Do not try to fix motivation first. Fix the next visible action.

1. For the next study block, set a task so small you cannot negotiate with it: revise one subtopic, solve a short set, or repair five errors.
2. Start with the subject that creates the most avoidance, but only for a short block.
3. Keep a "done list" beside the plan. Confidence returns when your brain can see proof of progress.
4. If you are exhausted, switch to low-friction work: formula recall, NCERT marking, or error-log cleanup.
5. Stop comparing full journeys. Compare today's execution with yesterday's.

Your only target for the next hour: open the weakest chapter and complete one measurable task.`;
}

function buildClarificationResponse(profile?: StudentProfile | null): string {
  return `${studentLine(profile)}I can help, but I need one sharper detail.

Tell me which of these you mean:
1. making a timetable,
2. choosing chapters or subjects,
3. improving mock scores,
4. handling school plus entrance prep,
5. dealing with stress or low motivation.

Reply with the number and your available study hours today.`;
}

function studentLine(profile?: StudentProfile | null): string {
  if (!profile) return "";
  const classLabel = CLASS_LABELS[profile.class] ?? profile.class;
  const exams = profile.targetExam.map((exam) => EXAM_LABELS[exam] ?? exam).join(" + ");
  return `For ${classLabel}${exams ? ` targeting ${exams}` : ""}, `;
}
