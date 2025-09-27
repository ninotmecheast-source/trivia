import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  difficulty: integer("difficulty").notNull().default(1), // 1-3 scale
});

export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  score: integer("score").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalQuestions: integer("total_questions").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  questionResults: jsonb("question_results"), // Array of {questionId, selectedAnswer, isCorrect, timeSpent}
});

export const rssPosts = pgTable("rss_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  link: text("link"),
  imageUrl: text("image_url"),
  imageType: text("image_type"),
  pubDate: timestamp("pub_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Known category IDs
export const VALID_CATEGORY_IDS = ["general", "science", "history", "sports", "entertainment", "music"] as const;

// Schemas for insertions
export const insertCategorySchema = createInsertSchema(categories);
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({ id: true });
export const insertRssPostSchema = createInsertSchema(rssPosts).omit({ id: true, createdAt: true });

// Validation schemas for API endpoints
export const categoryQuestionsParamsSchema = z.object({
  categoryId: z.enum(VALID_CATEGORY_IDS, {
    errorMap: () => ({ message: "Invalid category. Must be one of: general, science, history, sports, entertainment, music" })
  })
});

export const categoryQuestionsQuerySchema = z.object({
  limit: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? val : parsed;
      }
      return val;
    },
    z.number()
      .int({ message: "Limit must be an integer" })
      .min(1, { message: "Limit must be at least 1" })
      .max(50, { message: "Limit cannot exceed 50" })
      .default(10)
  ).optional()
});

// Strict update schema for game sessions - only allows specific fields
export const updateGameSessionSchema = z.object({
  score: z.number()
    .int({ message: "Score must be an integer" })
    .min(0, { message: "Score cannot be negative" })
    .refine((val) => !isNaN(val), { message: "Score cannot be NaN" })
    .optional(),
  correctAnswers: z.number()
    .int({ message: "Correct answers must be an integer" })
    .min(0, { message: "Correct answers cannot be negative" })
    .refine((val) => !isNaN(val), { message: "Correct answers cannot be NaN" })
    .optional(),
  endTime: z.string().nullable().optional(),
  questionResults: z.array(
    z.object({
      questionId: z.string(),
      selectedAnswer: z.number().int(),
      isCorrect: z.boolean(),
      timeSpent: z.number().min(0)
    })
  ).nullable().optional()
}).strict(); // This will reject any unknown keys

// Refined update schema that validates correctAnswers <= totalQuestions
export const createUpdateGameSessionSchema = (totalQuestions?: number) => {
  return updateGameSessionSchema.refine(
    (data) => {
      if (data.correctAnswers !== undefined && totalQuestions !== undefined) {
        return data.correctAnswers <= totalQuestions;
      }
      return true;
    },
    {
      message: "Correct answers cannot exceed total questions",
      path: ["correctAnswers"]
    }
  );
};

// Types
export type Category = typeof categories.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type RssPost = typeof rssPosts.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type InsertRssPost = z.infer<typeof insertRssPostSchema>;
export type UpdateGameSession = z.infer<typeof updateGameSessionSchema>;