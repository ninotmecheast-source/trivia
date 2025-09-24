import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGameSessionSchema,
  categoryQuestionsParamsSchema,
  categoryQuestionsQuerySchema,
  createUpdateGameSessionSchema
} from "@shared/schema";
import { z } from "zod";
import express from "express";

export function registerRSS(app: express.Application) {
  app.get("/rss.xml", (req, res) => {
    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Triveast News</title>
    <link>https://triveast.com</link>
    <description>Latest updates and news from Triveast</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>

    <item>
      <title>Welcome to Triveast 💥</title>
      <link>https://triveast.com/news/welcome</link>
      <description>This is our very first news post on Triveast.</description>
      <pubDate>${new Date("2025-09-18T14:00:00Z").toUTCString()}</pubDate>
    </item>

    <item>
      <title>Trivia Game Updated 🕹️</title>
      <link>https://triveast.com/news/trivia-update</link>
      <description>We’ve added donation buttons, score tracking, and an RSS feed!</description>
      <pubDate>${new Date("2025-09-18T14:15:00Z").toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;
    res.set("Content-Type", "application/xml");
    res.send(rss);
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  

  // Get questions for a specific category
  app.get("/api/categories/:categoryId/questions", async (req, res) => {
    try {
      // Validate categoryId parameter
      const paramsResult = categoryQuestionsParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        return res.status(400).json({ 
          error: "Invalid category parameter", 
          details: paramsResult.error.errors 
        });
      }

      // Validate query parameters  
      const queryResult = categoryQuestionsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: queryResult.error.errors 
        });
      }

      const { categoryId } = paramsResult.data;
      const { limit = 10 } = queryResult.data;
      
      // Prevent NaN values from reaching downstream APIs
      if (!Number.isInteger(limit) || isNaN(limit)) {
        return res.status(400).json({ error: "Invalid limit parameter" });
      }

      const category = await storage.getCategoryById(categoryId);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      const questions = await storage.getQuestionsByCategory(categoryId, limit);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Create a new game session
  app.post("/api/game-sessions", async (req, res) => {
    try {
      const sessionData = insertGameSessionSchema.parse(req.body);
      const session = await storage.createGameSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      console.error("Error creating game session:", error);
      res.status(500).json({ error: "Failed to create game session" });
    }
  });

  // Get a game session
  app.get("/api/game-sessions/:sessionId", async (req, res) => {
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

  // Update a game session (for scoring and completion)
  app.patch("/api/game-sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;

      // First, get the existing session to access totalQuestions for validation
      const existingSession = await storage.getGameSession(sessionId);
      if (!existingSession) {
        return res.status(404).json({ error: "Game session not found" });
      }

      // Create the update schema with totalQuestions constraint
      const updateSchema = createUpdateGameSessionSchema(existingSession.totalQuestions);
      
      // Validate the request body with strict schema
      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid update data", 
          details: validationResult.error.errors 
        });
      }

      const updates = validationResult.data;

      // Additional security: Prevent NaN values and check for memory bloat
      if (updates.score !== undefined && (isNaN(updates.score) || !Number.isFinite(updates.score))) {
        return res.status(400).json({ error: "Score must be a valid finite number" });
      }
      
      if (updates.correctAnswers !== undefined && (isNaN(updates.correctAnswers) || !Number.isFinite(updates.correctAnswers))) {
        return res.status(400).json({ error: "Correct answers must be a valid finite number" });
      }

      // Input sanitization for questionResults array to prevent memory bloat
      if (updates.questionResults && Array.isArray(updates.questionResults)) {
        if (updates.questionResults.length > 100) { // Reasonable limit to prevent DoS
          return res.status(400).json({ error: "Question results array too large" });
        }
      }

      const updatedSession = await storage.updateGameSession(sessionId, updates);
      
      if (!updatedSession) {
        return res.status(404).json({ error: "Game session not found" });
      }
      
      res.json(updatedSession);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating game session:", error);
      res.status(500).json({ error: "Failed to update game session" });
    }
  });

  // Delete a game session
  app.delete("/api/game-sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;

      // Input sanitization for sessionId to prevent potential issues
      if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const deleted = await storage.deleteGameSession(sessionId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Game session not found" });
      }
      
      res.status(204).send(); // No content on successful deletion
    } catch (error) {
      console.error("Error deleting game session:", error);
      res.status(500).json({ error: "Failed to delete game session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}