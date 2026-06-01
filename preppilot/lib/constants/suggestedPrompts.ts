export type StudentClass = "class_11" | "class_12" | "dropper";

export const CLASS_11_PROMPTS: readonly string[] = [
  "How do I manage school exams along with JEE preparation without affecting either one?",
  "How do I solve advanced JEE questions on my own?",
  "How many hours should I ideally study daily for JEE preparation?",
  "From which subject should I start my preparation — weakest or strongest?",
  "I keep forgetting formulas after a few weeks. What is the best way to retain them for a longer time?",
  "How can I improve my speed and accuracy while solving JEE questions?",
  "Is NCERT enough for JEE Main and Advanced preparation, or should I buy modules and PYQ books also?",
  "What should I do if my mock test scores are not improving despite regular practice?",
  "How many mock tests should I attempt every month in Class 11?",
  "Which is more important for JEE preparation: coaching modules, PYQs, or reference books?",
  "What is the best strategy to complete backlogs without disturbing current studies?",
  "How many times should I revise a chapter before considering it fully prepared?",
  "How can I avoid burnout and stress during intense JEE preparation?",
  "How should I prepare for JEE if I started late in Class 11?",
  "How do toppers usually make notes for quick revision?",
  "Is it better to study one subject for long hours or rotate subjects daily?",
  "What should be my daily study routine during school days versus holidays?",
  "How can I analyze mock tests effectively to improve performance?",
];

export const CLASS_12_PROMPTS: readonly string[] = [
  "How do I balance Class 12 boards and JEE preparation together?",
  "How many mock tests should I attempt every week?",
  "What should I do if my mock test scores are not improving?",
  "How can I manage revision for all three subjects effectively?",
  "What is the best strategy to reduce negative marking?",
  "How can I improve concentration during long study hours?",
  "What should be my strategy for the last 3 months before JEE?",
  "How can I improve my problem-solving speed for JEE-level questions?",
  "Why do I forget concepts even after revising multiple times?",
  "What should be the ideal daily study schedule for JEE preparation?",
  "How can I improve accuracy while maintaining speed?",
  "What is the right balance between theory study and question practice?",
  "How do toppers manage revision and practice together?",
  "What are the most common mistakes students make during JEE preparation?",
  "Which is more important for JEE preparation: coaching modules, PYQs, or reference books?",
];

export const DROPPER_PROMPTS: readonly string[] = [
  "Where did I go wrong in my first JEE attempt despite studying for the whole year?",
  "What should be different in my drop year strategy compared to last year?",
  "How can I improve my mock test scores consistently as a dropper?",
  "What should be my daily study schedule during the drop year?",
  "How do I manage self-doubt after taking a drop for JEE?",
  "What is the best way to analyze mistakes from previous mock tests?",
  "Why am I still making silly mistakes even after practicing a lot?",
  "How should I balance theory revision and question practice effectively?",
  "How many mock tests should a dropper attempt every month?",
  "What should I do if my preparation is not improving despite long study hours?",
  "How can I overcome fear and pressure from family expectations?",
  "What should be my strategy for the last 3 months before the JEE exam?",
  "What should I do when I lose confidence after a bad mock test?",
  "How can I improve question selection during the exam?",
  "Why am I unable to perform well under exam pressure?",
  "How should I prepare differently for JEE Main and JEE Advanced?",
  "What are the biggest mistakes droppers usually make during preparation?",
  "What should I do if my score gets stuck at the same range in mocks?",
];

export function getPromptsForClass(c: StudentClass): readonly string[] {
  switch (c) {
    case "class_11":
      return CLASS_11_PROMPTS;
    case "class_12":
      return CLASS_12_PROMPTS;
    case "dropper":
      return DROPPER_PROMPTS;
  }
}

export function getRandomPrompts(c: StudentClass, count = 4): string[] {
  const all = [...getPromptsForClass(c)];
  const out: string[] = [];
  while (out.length < count && all.length > 0) {
    const idx = Math.floor(Math.random() * all.length);
    out.push(all.splice(idx, 1)[0]);
  }
  return out;
}
