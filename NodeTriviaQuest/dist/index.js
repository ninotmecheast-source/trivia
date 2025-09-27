// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID as randomUUID2 } from "crypto";

// server/trivia-api.ts
import { randomUUID } from "crypto";
var CATEGORY_MAPPING = {
  general: 9,
  // General Knowledge
  science: 17,
  // Science & Nature
  history: 23,
  // History
  sports: 21,
  // Sports
  entertainment: 11,
  // Entertainment: Film
  music: 12
  // Entertainment: Music
};
var REVERSE_CATEGORY_MAPPING = Object.fromEntries(
  Object.entries(CATEGORY_MAPPING).map(([key, value]) => [value, key])
);
var TriviaAPIService = class {
  cache = /* @__PURE__ */ new Map();
  CACHE_DURATION = 10 * 60 * 1e3;
  // 10 minutes
  BASE_URL = "https://opentdb.com/api.php";
  /**
   * Get questions for a specific category from the API or cache
   */
  async getQuestionsByCategory(categoryId, limit = 10) {
    const cacheKey = `${categoryId}_${limit}`;
    const cached = this.getCachedQuestions(cacheKey);
    if (cached && cached.length >= limit) {
      return cached.slice(0, limit);
    }
    try {
      const questions2 = await this.fetchQuestionsFromAPI(categoryId, limit);
      this.cacheQuestions(cacheKey, questions2);
      return questions2.slice(0, limit);
    } catch (error) {
      console.error("Error fetching questions from API:", error);
      const fallbackCache = this.cache.get(cacheKey);
      if (fallbackCache && fallbackCache.questions.length > 0) {
        console.log("Using expired cache as fallback");
        return fallbackCache.questions.slice(0, limit);
      }
      return this.getFallbackQuestions(categoryId, limit);
    }
  }
  /**
   * Fetch questions from Open Trivia Database API
   */
  async fetchQuestionsFromAPI(categoryId, amount) {
    const openTriviaCategory = CATEGORY_MAPPING[categoryId];
    if (!openTriviaCategory) {
      throw new Error(`Unknown category: ${categoryId}`);
    }
    const url = new URL(this.BASE_URL);
    url.searchParams.append("amount", amount.toString());
    url.searchParams.append("category", openTriviaCategory.toString());
    url.searchParams.append("type", "multiple");
    url.searchParams.append("encode", "url3986");
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.response_code !== 0) {
      const errorMessage = this.getAPIErrorMessage(data.response_code);
      throw new Error(`Open Trivia DB API error: ${errorMessage} (code: ${data.response_code})`);
    }
    if (!data.results || data.results.length === 0) {
      throw new Error("No questions returned from API");
    }
    return data.results.map((result) => this.transformAPIQuestion(result, categoryId));
  }
  /**
   * Transform Open Trivia Database question format to our Question format
   */
  transformAPIQuestion(apiQuestion, categoryId) {
    const question = decodeURIComponent(apiQuestion.question);
    const correctAnswer = decodeURIComponent(apiQuestion.correct_answer);
    const incorrectAnswers = apiQuestion.incorrect_answers.map((answer) => decodeURIComponent(answer));
    const allOptions = [correctAnswer, ...incorrectAnswers];
    const shuffledOptions = this.shuffleArray([...allOptions]);
    const correctAnswerIndex = shuffledOptions.indexOf(correctAnswer);
    const difficultyMap = {
      easy: 1,
      medium: 2,
      hard: 3
    };
    return {
      id: randomUUID(),
      categoryId,
      question,
      options: shuffledOptions,
      correctAnswer: correctAnswerIndex,
      difficulty: difficultyMap[apiQuestion.difficulty] || 2
    };
  }
  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  /**
   * Get cached questions if they're still valid
   */
  getCachedQuestions(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }
    const now = Date.now();
    if (now > cached.expiry) {
      return null;
    }
    return cached.questions;
  }
  /**
   * Cache questions with timestamp and expiry
   */
  cacheQuestions(cacheKey, questions2) {
    const now = Date.now();
    this.cache.set(cacheKey, {
      questions: questions2,
      timestamp: now,
      expiry: now + this.CACHE_DURATION
    });
    this.cleanupExpiredCache();
  }
  /**
   * Clean up expired cache entries to prevent memory bloat
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiry + this.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    }
    expiredKeys.forEach((key) => this.cache.delete(key));
  }
  /**
   * Get error message for Open Trivia Database API response codes
   */
  getAPIErrorMessage(code) {
    switch (code) {
      case 1:
        return "No Results - Could not return results. The API doesn't have enough questions for your query.";
      case 2:
        return "Invalid Parameter - Contains an invalid parameter.";
      case 3:
        return "Token Not Found - Session Token does not exist.";
      case 4:
        return "Token Empty - Session Token has returned all possible questions for the specified query.";
      case 5:
        return "Rate Limit - Too many requests have been sent.";
      default:
        return `Unknown error code: ${code}`;
    }
  }
  /**
   * Provide hardcoded fallback questions when API fails completely
   */
  getFallbackQuestions(categoryId, limit) {
    const fallbackQuestions = {
      science: [
        {
          categoryId: "science",
          question: "What is the largest planet in our solar system?",
          options: ["Earth", "Jupiter", "Saturn", "Neptune"],
          correctAnswer: 1,
          difficulty: 1
        },
        {
          categoryId: "science",
          question: "What is the chemical symbol for gold?",
          options: ["Go", "Gd", "Au", "Ag"],
          correctAnswer: 2,
          difficulty: 2
        }
      ],
      history: [
        {
          categoryId: "history",
          question: "In which year did World War II end?",
          options: ["1944", "1945", "1946", "1947"],
          correctAnswer: 1,
          difficulty: 1
        },
        {
          categoryId: "history",
          question: "Who was the first person to walk on the moon?",
          options: ["Buzz Aldrin", "Neil Armstrong", "John Glenn", "Alan Shepard"],
          correctAnswer: 1,
          difficulty: 1
        }
      ],
      general: [
        {
          categoryId: "general",
          question: "What is the capital of Australia?",
          options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
          correctAnswer: 2,
          difficulty: 2
        },
        {
          categoryId: "general",
          question: "Which planet is known as the Red Planet?",
          options: ["Venus", "Mars", "Jupiter", "Saturn"],
          correctAnswer: 1,
          difficulty: 1
        }
      ],
      sports: [
        {
          categoryId: "sports",
          question: "How many players are on a basketball team on the court at one time?",
          options: ["4", "5", "6", "7"],
          correctAnswer: 1,
          difficulty: 1
        }
      ],
      entertainment: [
        {
          categoryId: "entertainment",
          question: "Which movie features the quote 'May the Force be with you'?",
          options: ["Star Trek", "Star Wars", "Blade Runner", "The Matrix"],
          correctAnswer: 1,
          difficulty: 1
        }
      ],
      music: [
        {
          categoryId: "music",
          question: "Which instrument has 88 keys?",
          options: ["Organ", "Piano", "Harpsichord", "Accordion"],
          correctAnswer: 1,
          difficulty: 1
        }
      ]
    };
    const categoryQuestions = fallbackQuestions[categoryId] || fallbackQuestions.general;
    return categoryQuestions.slice(0, limit).map((q) => ({
      ...q,
      id: randomUUID(),
      difficulty: q.difficulty ?? 1
      // Ensure difficulty is always a number
    }));
  }
  /**
   * Clear all cached questions (useful for testing or manual cache refresh)
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get cache statistics (useful for monitoring)
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    for (const entry of Array.from(this.cache.values())) {
      if (now <= entry.expiry) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries
    };
  }
};
var triviaAPI = new TriviaAPIService();

// server/storage.ts
var MemStorage = class {
  categories;
  questions;
  gameSessions;
  constructor() {
    this.categories = /* @__PURE__ */ new Map();
    this.questions = /* @__PURE__ */ new Map();
    this.gameSessions = /* @__PURE__ */ new Map();
    this.initializeCategories();
  }
  initializeCategories() {
    const defaultCategories = [
      {
        id: "general",
        name: "General Knowledge",
        description: "Mix of topics from various fields",
        icon: "BookOpen"
      },
      {
        id: "science",
        name: "Science & Nature",
        description: "Biology, chemistry, physics & more",
        icon: "Atom"
      },
      {
        id: "history",
        name: "History",
        description: "World events and historical facts",
        icon: "Globe"
      },
      {
        id: "sports",
        name: "Sports",
        description: "Athletics, games, and competitions",
        icon: "Trophy"
      },
      {
        id: "entertainment",
        name: "Entertainment",
        description: "Movies, TV shows, and pop culture",
        icon: "Gamepad2"
      },
      {
        id: "music",
        name: "Music",
        description: "Artists, songs, and musical history",
        icon: "Music"
      }
    ];
    defaultCategories.forEach((category) => {
      this.categories.set(category.id, category);
    });
  }
  // Categories
  async getCategories() {
    return Array.from(this.categories.values());
  }
  async getCategoryById(id) {
    return this.categories.get(id);
  }
  async createCategory(insertCategory) {
    const category = { ...insertCategory };
    this.categories.set(category.id, category);
    return category;
  }
  // Questions
  async getQuestionsByCategory(categoryId, limit = 10) {
    return await triviaAPI.getQuestionsByCategory(categoryId, limit);
  }
  async getQuestionById(id) {
    return this.questions.get(id);
  }
  async createQuestion(insertQuestion) {
    const id = randomUUID2();
    const question = {
      ...insertQuestion,
      id,
      difficulty: insertQuestion.difficulty ?? 1
      // Ensure difficulty is always a number
    };
    this.questions.set(id, question);
    return question;
  }
  async createManyQuestions(insertQuestions) {
    const questions2 = [];
    for (const insertQuestion of insertQuestions) {
      const question = await this.createQuestion(insertQuestion);
      questions2.push(question);
    }
    return questions2;
  }
  // Game Sessions
  async createGameSession(insertSession) {
    const id = randomUUID2();
    const session = {
      ...insertSession,
      id,
      score: insertSession.score ?? 0,
      // Ensure score is always a number
      correctAnswers: insertSession.correctAnswers ?? 0,
      // Ensure correctAnswers is always a number
      endTime: insertSession.endTime ?? null,
      // Ensure endTime is string | null, not undefined
      questionResults: insertSession.questionResults ?? null
      // Ensure questionResults is present
    };
    this.gameSessions.set(id, session);
    return session;
  }
  async getGameSession(id) {
    return this.gameSessions.get(id);
  }
  async updateGameSession(id, updates) {
    const session = this.gameSessions.get(id);
    if (!session) return void 0;
    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }
  async deleteGameSession(id) {
    return this.gameSessions.delete(id);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var categories = pgTable("categories", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull()
});
var questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  difficulty: integer("difficulty").notNull().default(1)
  // 1-3 scale
});
var gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  score: integer("score").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalQuestions: integer("total_questions").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  questionResults: jsonb("question_results")
  // Array of {questionId, selectedAnswer, isCorrect, timeSpent}
});
var VALID_CATEGORY_IDS = ["general", "science", "history", "sports", "entertainment", "music"];
var insertCategorySchema = createInsertSchema(categories);
var insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
var insertGameSessionSchema = createInsertSchema(gameSessions).omit({ id: true });
var categoryQuestionsParamsSchema = z.object({
  categoryId: z.enum(VALID_CATEGORY_IDS, {
    errorMap: () => ({ message: "Invalid category. Must be one of: general, science, history, sports, entertainment, music" })
  })
});
var categoryQuestionsQuerySchema = z.object({
  limit: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? val : parsed;
      }
      return val;
    },
    z.number().int({ message: "Limit must be an integer" }).min(1, { message: "Limit must be at least 1" }).max(50, { message: "Limit cannot exceed 50" }).default(10)
  ).optional()
});
var updateGameSessionSchema = z.object({
  score: z.number().int({ message: "Score must be an integer" }).min(0, { message: "Score cannot be negative" }).refine((val) => !isNaN(val), { message: "Score cannot be NaN" }).optional(),
  correctAnswers: z.number().int({ message: "Correct answers must be an integer" }).min(0, { message: "Correct answers cannot be negative" }).refine((val) => !isNaN(val), { message: "Correct answers cannot be NaN" }).optional(),
  endTime: z.string().nullable().optional(),
  questionResults: z.array(
    z.object({
      questionId: z.string(),
      selectedAnswer: z.number().int(),
      isCorrect: z.boolean(),
      timeSpent: z.number().min(0)
    })
  ).nullable().optional()
}).strict();
var createUpdateGameSessionSchema = (totalQuestions) => {
  return updateGameSessionSchema.refine(
    (data) => {
      if (data.correctAnswers !== void 0 && totalQuestions !== void 0) {
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

// server/routes.ts
import { z as z2 } from "zod";
function registerRSS(app2) {
  app2.get("/rss.xml", (req, res) => {
    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Triveast News</title>
    <link>https://triveast.com</link>
    <description>Latest updates and news from Triveast</description>
    <language>en-us</language>
    <lastBuildDate>${(/* @__PURE__ */ new Date()).toUTCString()}</lastBuildDate>

    <item>
      <title>Welcome to Triveast \u{1F4A5}</title>
      <link>https://triveast.com/news/welcome</link>
      <description>This is our very first news post on Triveast.</description>
      <pubDate>${(/* @__PURE__ */ new Date("2025-09-18T14:00:00Z")).toUTCString()}</pubDate>
    </item>

    <item>
      <title>Trivia Game Updated \u{1F579}\uFE0F</title>
      <link>https://triveast.com/news/trivia-update</link>
      <description>We\u2019ve added donation buttons, score tracking, and an RSS feed!</description>
      <pubDate>${(/* @__PURE__ */ new Date("2025-09-18T14:15:00Z")).toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;
    res.set("Content-Type", "application/xml");
    res.send(rss);
  });
}
async function registerRoutes(app2) {
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage.getCategories();
      res.json(categories2);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app2.get("/api/categories/:categoryId/questions", async (req, res) => {
    try {
      const paramsResult = categoryQuestionsParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return res.status(400).json({
          error: "Invalid category parameter",
          details: paramsResult.error.errors
        });
      }
      const queryResult = categoryQuestionsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: queryResult.error.errors
        });
      }
      const { categoryId } = paramsResult.data;
      const { limit = 10 } = queryResult.data;
      if (!Number.isInteger(limit) || isNaN(limit)) {
        return res.status(400).json({ error: "Invalid limit parameter" });
      }
      const category = await storage.getCategoryById(categoryId);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      const questions2 = await storage.getQuestionsByCategory(categoryId, limit);
      res.json(questions2);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });
  app2.post("/api/game-sessions", async (req, res) => {
    try {
      const sessionData = insertGameSessionSchema.parse(req.body);
      const session = await storage.createGameSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      console.error("Error creating game session:", error);
      res.status(500).json({ error: "Failed to create game session" });
    }
  });
  app2.get("/api/game-sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Game session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching game session:", error);
      res.status(500).json({ error: "Failed to fetch game session" });
    }
  });
  app2.patch("/api/game-sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const existingSession = await storage.getGameSession(sessionId);
      if (!existingSession) {
        return res.status(404).json({ error: "Game session not found" });
      }
      const updateSchema = createUpdateGameSessionSchema(existingSession.totalQuestions);
      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid update data",
          details: validationResult.error.errors
        });
      }
      const updates = validationResult.data;
      if (updates.score !== void 0 && (isNaN(updates.score) || !Number.isFinite(updates.score))) {
        return res.status(400).json({ error: "Score must be a valid finite number" });
      }
      if (updates.correctAnswers !== void 0 && (isNaN(updates.correctAnswers) || !Number.isFinite(updates.correctAnswers))) {
        return res.status(400).json({ error: "Correct answers must be a valid finite number" });
      }
      if (updates.questionResults && Array.isArray(updates.questionResults)) {
        if (updates.questionResults.length > 100) {
          return res.status(400).json({ error: "Question results array too large" });
        }
      }
      const updatedSession = await storage.updateGameSession(sessionId, updates);
      if (!updatedSession) {
        return res.status(404).json({ error: "Game session not found" });
      }
      res.json(updatedSession);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating game session:", error);
      res.status(500).json({ error: "Failed to update game session" });
    }
  });
  app2.delete("/api/game-sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      if (!sessionId || typeof sessionId !== "string" || sessionId.trim().length === 0) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const deleted = await storage.deleteGameSession(sessionId);
      if (!deleted) {
        return res.status(404).json({ error: "Game session not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting game session:", error);
      res.status(500).json({ error: "Failed to delete game session" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path3 from "path";
import fs2 from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";
import { z as z3 } from "zod";

// server/stockService.ts
import fetch2 from "node-fetch";
var StockService = class {
  balance;
  portfolio;
  // Cache quotes for a short period to reduce upstream API calls
  quoteCache;
  // Cache TTL in milliseconds (default 60 seconds)
  cacheTtl;
  constructor(initialBalance = 1e4, cacheTtlMs = 6e4) {
    this.balance = initialBalance;
    this.portfolio = {};
    this.quoteCache = /* @__PURE__ */ new Map();
    this.cacheTtl = cacheTtlMs;
  }
  /**
   * Fetch a stock quote for the given symbol. If a cached value exists and
   * hasn't expired, return it. Otherwise fetch from Yahoo Finance.
   */
  async getQuote(symbol) {
    const key = symbol.toUpperCase();
    const now = Date.now();
    const cached = this.quoteCache.get(key);
    if (cached && now - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }
    const response = await fetch2(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(key)}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch stock data");
    }
    const data = await response.json();
    const quote = data?.quoteResponse?.result?.[0];
    if (!quote) {
      throw new Error("Invalid quote response");
    }
    const result = {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChangePercent
    };
    this.quoteCache.set(key, { timestamp: now, data: result });
    return result;
  }
  /**
   * Buy shares of a stock. Throws an error if funds are insufficient or
   * arguments are invalid. Returns updated balance and portfolio on success.
   */
  buy(symbol, shares, price) {
    const key = symbol.toUpperCase();
    const cost = shares * price;
    if (cost > this.balance) {
      throw new Error("Not enough funds");
    }
    this.balance -= cost;
    if (!this.portfolio[key]) {
      this.portfolio[key] = { shares: 0, avgPrice: 0 };
    }
    const holding = this.portfolio[key];
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + shares);
    holding.shares += shares;
    return { balance: this.balance, portfolio: this.getPortfolio() };
  }
  /**
   * Sell shares of a stock. Throws an error if there aren't enough shares. On
   * success returns updated balance and portfolio. If all shares are sold,
   * removes the position from the portfolio.
   */
  sell(symbol, shares, price) {
    const key = symbol.toUpperCase();
    const position = this.portfolio[key];
    if (!position || position.shares < shares) {
      throw new Error("Not enough shares");
    }
    const revenue = shares * price;
    this.balance += revenue;
    position.shares -= shares;
    if (position.shares === 0) {
      delete this.portfolio[key];
    }
    return { balance: this.balance, portfolio: this.getPortfolio() };
  }
  /**
   * Get the current portfolio and balance. Returns a shallow copy of the
   * portfolio to prevent external mutation.
   */
  getPortfolio() {
    return Object.fromEntries(
      Object.entries(this.portfolio).map(([sym, position]) => [sym, { ...position }])
    );
  }
  getBalance() {
    return this.balance;
  }
};

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var app = express2();
var allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
var allowedOrigins;
if (allowedOriginsEnv && allowedOriginsEnv !== "*") {
  allowedOrigins = allowedOriginsEnv.split(",").map((o) => o.trim()).filter((o) => o.length > 0);
}
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (!allowedOrigins || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
var upload = multer({
  dest: path3.resolve(__dirname, "../client/public/uploads"),
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedMime = ["image/jpeg", "image/png", "image/gif"];
    const ext = path3.extname(file.originalname).toLowerCase();
    const allowedExt = [".jpg", ".jpeg", ".png", ".gif"];
    if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG and GIF images are allowed"));
    }
  }
});
var stockService = new StockService(1e4);
var tradeSchema = z3.object({
  symbol: z3.string().trim().min(1).max(10).regex(/^[A-Za-z0-9.\-]+$/, { message: "Invalid ticker symbol" }),
  shares: z3.preprocess((val) => {
    if (typeof val === "string") return Number(val);
    return val;
  }, z3.number().int().positive({ message: "Shares must be a positive integer" })),
  price: z3.preprocess((val) => {
    if (typeof val === "string") return Number(val);
    return val;
  }, z3.number().positive({ message: "Price must be a positive number" }))
});
app.get("/api/quote/:symbol", async (req, res) => {
  const { symbol } = req.params;
  try {
    const quote = await stockService.getQuote(symbol);
    res.json(quote);
  } catch (err) {
    console.error("Error fetching quote:", err);
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
});
app.post("/api/buy", (req, res) => {
  const parseResult = tradeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid trade data", details: parseResult.error.errors });
  }
  const { symbol, shares, price } = parseResult.data;
  try {
    const result = stockService.buy(symbol, shares, price);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Trade failed" });
  }
});
app.post("/api/sell", (req, res) => {
  const parseResult = tradeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid trade data", details: parseResult.error.errors });
  }
  const { symbol, shares, price } = parseResult.data;
  try {
    const result = stockService.sell(symbol, shares, price);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Trade failed" });
  }
});
app.get("/api/portfolio", (req, res) => {
  res.json({ balance: stockService.getBalance(), portfolio: stockService.getPortfolio() });
});
app.post("/api/rss/add", upload.single("image"), (req, res) => {
  const configuredToken = process.env.ADMIN_TOKEN;
  if (configuredToken) {
    const headerToken = req.headers["x-admin-token"];
    if (!headerToken || headerToken !== configuredToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
  const { title, link, description } = req.body;
  const file = req.file;
  if (!title || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const escapeXml = (str) => String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
  const rssPath = path3.resolve(__dirname, "../client/public/rss.xml");
  if (!fs2.existsSync(rssPath)) {
    const baseRss = `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>Triveast News</title>
          <link>https://triveast.com/news</link>
          <description>Latest updates and news from Triveast</description>
          <language>en-us</language>
          <lastBuildDate>${(/* @__PURE__ */ new Date()).toUTCString()}</lastBuildDate>
        </channel>
      </rss>`;
    fs2.writeFileSync(rssPath, baseRss, "utf8");
  }
  let xml = fs2.readFileSync(rssPath, "utf8");
  let imageTag = "";
  if (file) {
    const ext = path3.extname(file.originalname).toLowerCase();
    const allowedExt = [".jpg", ".jpeg", ".png", ".gif"];
    if (!allowedExt.includes(ext)) {
      fs2.unlinkSync(file.path);
      return res.status(400).json({ error: "Invalid file type" });
    }
    const newFileName = `${file.filename}${ext}`;
    const uploadDir = path3.resolve(__dirname, "../client/public/uploads");
    const newPath = path3.join(uploadDir, newFileName);
    fs2.renameSync(file.path, newPath);
    imageTag = `<enclosure url="/uploads/${newFileName}" type="image/${ext.replace(".", "")}" />`;
  }
  const newItem = `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link || "https://triveast.com/news")}</link>
      <description>${escapeXml(description)}</description>
      ${imageTag}
      <pubDate>${(/* @__PURE__ */ new Date()).toUTCString()}</pubDate>
    </item>
  `;
  xml = xml.replace("</channel>", `${newItem}
</channel>`);
  fs2.writeFileSync(rssPath, xml, "utf8");
  res.json({ success: true, message: "Post added!" });
});
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "\u2026";
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
    registerRSS(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
