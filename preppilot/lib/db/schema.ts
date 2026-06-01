import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export type StudentClass = "class_11" | "class_12" | "dropper";
export type TargetExam = "jee_main" | "jee_advanced" | "neet";
export type Subject = "physics" | "chemistry" | "math" | "biology";
export type SchoolLoad = "light" | "medium" | "heavy";
export type IntentLabel =
  | "academic_solve"
  | "plan_request"
  | "strategy"
  | "motivation"
  | "clarification"
  | "out_of_scope";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentProfiles = pgTable("student_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  class: text("class").$type<StudentClass>().notNull(),
  targetExam: text("target_exam").array().$type<TargetExam[]>().notNull(),
  targetYear: integer("target_year").notNull(),
  coaching: jsonb("coaching").$type<{ enrolled: boolean; name?: string }>().notNull(),
  strongSubjects: text("strong_subjects").array().$type<Subject[]>().notNull(),
  weakSubjects: text("weak_subjects").array().$type<Subject[]>().notNull(),
  mockScoreRange: text("mock_score_range").notNull(),
  dailyStudyHours: integer("daily_study_hours").notNull(),
  schoolLoad: text("school_load").$type<SchoolLoad>(),
  previousAttemptScore: integer("previous_attempt_score"),
  previousMistakes: text("previous_mistakes"),
  emotionalState: text("emotional_state"),
  goals: text("goals"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    rollingSummary: text("rolling_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUpdatedIdx: index("conversations_user_updated_idx").on(t.userId, t.updatedAt),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant" | "system">().notNull(),
    content: text("content").notNull(),
    intentLabel: text("intent_label").$type<IntentLabel>(),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    model: text("model"),
    latencyMs: integer("latency_ms"),
    refused: boolean("refused").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    convCreatedIdx: index("messages_conv_created_idx").on(t.conversationId, t.createdAt),
  }),
);

export const savedPlans = pgTable(
  "saved_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    durationWeeks: integer("duration_weeks"),
    planMarkdown: text("plan_markdown").notNull(),
    sourceMessageId: uuid("source_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("plans_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    route: text("route").notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("usage_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export const refusalLogs = pgTable("refusal_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  messageExcerpt: text("message_excerpt").notNull(),
  reason: text("reason").$type<"classifier" | "guardrail">().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const flaggedConversations = pgTable("flagged_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  reviewed: boolean("reviewed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Relations ----
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  conversations: many(conversations),
  plans: many(savedPlans),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
