import { 
  type Category, 
  type Question, 
  type GameSession, 
  type InsertCategory, 
  type InsertQuestion, 
  type InsertGameSession 
} from "@shared/schema";
import { randomUUID } from "crypto";
import { triviaAPI } from "./trivia-api";

// Storage interface for trivia game data
export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Questions
  getQuestionsByCategory(categoryId: string, limit?: number): Promise<Question[]>;
  getQuestionById(id: string): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  createManyQuestions(questions: InsertQuestion[]): Promise<Question[]>;

  // Game Sessions
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  deleteGameSession(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private categories: Map<string, Category>;
  private questions: Map<string, Question>;
  private gameSessions: Map<string, GameSession>;

  constructor() {
    this.categories = new Map();
    this.questions = new Map();
    this.gameSessions = new Map();
    this.initializeCategories();
  }

  private initializeCategories() {
    // Initialize categories (metadata only - questions will be fetched from API)
    const defaultCategories: Category[] = [
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

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }


  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const category: Category = { ...insertCategory };
    this.categories.set(category.id, category);
    return category;
  }

  // Questions
  async getQuestionsByCategory(categoryId: string, limit = 10): Promise<Question[]> {
    // Fetch questions from Open Trivia Database API
    return await triviaAPI.getQuestionsByCategory(categoryId, limit);
  }

  async getQuestionById(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = randomUUID();
    const question: Question = { 
      ...insertQuestion, 
      id,
      difficulty: insertQuestion.difficulty ?? 1 // Ensure difficulty is always a number
    };
    this.questions.set(id, question);
    return question;
  }

  async createManyQuestions(insertQuestions: InsertQuestion[]): Promise<Question[]> {
    const questions: Question[] = [];
    for (const insertQuestion of insertQuestions) {
      const question = await this.createQuestion(insertQuestion);
      questions.push(question);
    }
    return questions;
  }

  // Game Sessions
  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const id = randomUUID();
    const session: GameSession = { 
      ...insertSession, 
      id,
      score: insertSession.score ?? 0, // Ensure score is always a number
      correctAnswers: insertSession.correctAnswers ?? 0, // Ensure correctAnswers is always a number
      endTime: insertSession.endTime ?? null, // Ensure endTime is string | null, not undefined
      questionResults: insertSession.questionResults ?? null // Ensure questionResults is present
    };
    this.gameSessions.set(id, session);
    return session;
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const session = this.gameSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteGameSession(id: string): Promise<boolean> {
    return this.gameSessions.delete(id);
  }
}

export const storage = new MemStorage();