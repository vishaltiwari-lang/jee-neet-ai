import { describe, expect, it } from "vitest";
import {
  assessSyllabusCoverage,
  buildSyllabusResponse,
  buildOutOfSyllabusMessage,
  buildSyllabusPromptSection,
} from "@/lib/knowledge/syllabus";

const jeeProfile = {
  class: "class_12" as const,
  targetExam: ["jee_main"] as const,
};

const neetProfile = {
  class: "dropper" as const,
  targetExam: ["neet"] as const,
};

describe("syllabus knowledge base", () => {
  it("embeds syllabus section in prompt context", () => {
    const section = buildSyllabusPromptSection(jeeProfile);
    expect(section).toContain("SYLLABUS KNOWLEDGE BASE");
    expect(section).toContain("Mathematics");
    expect(section).toContain("Physics");
  });

  it("marks known syllabus topic requests as covered", () => {
    const result = assessSyllabusCoverage("Create a 2-week plan for optics and electrostatics", jeeProfile);
    expect(result.status).toBe("covered");
  });

  it("allows genuine student strategy help even without exact unit match", () => {
    const result = assessSyllabusCoverage(
      "I can study only 2 hours now but teacher says 6 to 8 for numericals. How should I improve?",
      jeeProfile,
    );
    expect(result.status).toBe("covered");
  });

  it("allows chapter help phrased with common aliases", () => {
    const result = assessSyllabusCoverage(
      "I understand Newton's laws theory but cannot solve numericals. Make a plan.",
      jeeProfile,
    );
    expect(result.status).toBe("covered");
  });

  it("blocks explicit out-of-syllabus topic requests", () => {
    const result = assessSyllabusCoverage("Make a chapter-wise plan for computer science and coding", neetProfile);
    expect(result.status).toBe("out_of_syllabus");
  });

  it("returns actionable message for out-of-syllabus requests", () => {
    const msg = buildOutOfSyllabusMessage(neetProfile);
    expect(msg).toContain("loaded syllabus knowledge base");
    expect(msg).toContain("Biology");
  });

  it("returns syllabus output for explicit syllabus requests", () => {
    const response = buildSyllabusResponse("show me jee syllabus", jeeProfile);
    expect(response).toContain("JEE (Main/Advanced) Syllabus");
    expect(response).toContain("Mathematics");
  });

  it("returns both tracks when user asks for jee and neet syllabus", () => {
    const response = buildSyllabusResponse("please share jee and neet syllabus", neetProfile);
    expect(response).toContain("JEE (Main/Advanced) Syllabus");
    expect(response).toContain("NEET Syllabus");
  });
});
