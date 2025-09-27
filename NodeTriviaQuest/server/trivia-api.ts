import type { Question, InsertQuestion } from "@shared/schema";
import { randomUUID } from "crypto";

// Category mapping from our internal IDs to Open Trivia Database IDs
const CATEGORY_MAPPING: Record<string, number> = {
  general: 9,      // General Knowledge
  science: 17,     // Science & Nature
  history: 23,     // History
  sports: 21,      // Sports
  entertainment: 11, // Entertainment: Film
  music: 12        // Entertainment: Music
};

// Reverse mapping for fallback behavior
const REVERSE_CATEGORY_MAPPING: Record<number, string> = Object.fromEntries(
  Object.entries(CATEGORY_MAPPING).map(([key, value]) => [value, key])
);

// Open Trivia Database API response types
interface OpenTriviaQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OpenTriviaResponse {
  response_code: number;
  results: OpenTriviaQuestion[];
}

// Question cache interface
interface QuestionCacheEntry {
  questions: Question[];
  timestamp: number;
  expiry: number;
}

export class TriviaAPIService {
  private cache = new Map<string, QuestionCacheEntry>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly BASE_URL = "https://opentdb.com/api.php";

  /**
   * Get questions for a specific category from the API or cache
   */
  async getQuestionsByCategory(categoryId: string, limit = 10): Promise<Question[]> {
    // For single questions, use a larger cache to ensure variety
    const cacheSize = limit === 1 ? 50 : Math.max(limit, 20);
    const cacheKey = `${categoryId}_batch`;
    
    // Check cache first
    const cached = this.getCachedQuestions(cacheKey);
    if (cached && cached.length >= limit) {
      // For single questions, return a random question from the cache
      if (limit === 1) {
        const randomIndex = Math.floor(Math.random() * Math.min(cached.length, 20));
        return [cached[randomIndex]];
      }
      return cached.slice(0, limit);
    }

    try {
      // Fetch from API
      const questions = await this.fetchQuestionsFromAPI(categoryId, cacheSize);
      
      // Cache the results
      this.cacheQuestions(cacheKey, questions);
      
      // For single questions, return a random question from the fetched batch
      if (limit === 1 && questions.length > 0) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        return [questions[randomIndex]];
      }
      
      return questions.slice(0, limit);
    } catch (error) {
      console.error("Error fetching questions from API:", error);
      
      // Return fallback cached questions if available, even if expired
      const fallbackCache = this.cache.get(cacheKey);
      if (fallbackCache && fallbackCache.questions.length > 0) {
        console.log("Using expired cache as fallback");
        if (limit === 1) {
          const randomIndex = Math.floor(Math.random() * Math.min(fallbackCache.questions.length, 20));
          return [fallbackCache.questions[randomIndex]];
        }
        return fallbackCache.questions.slice(0, limit);
      }
      
      // As a last resort, return hardcoded fallback questions
      return this.getFallbackQuestions(categoryId, limit);
    }
  }

  /**
   * Fetch questions from Open Trivia Database API
   */
  private async fetchQuestionsFromAPI(categoryId: string, amount: number): Promise<Question[]> {
    const openTriviaCategory = CATEGORY_MAPPING[categoryId];
    
    if (!openTriviaCategory) {
      throw new Error(`Unknown category: ${categoryId}`);
    }

    const url = new URL(this.BASE_URL);
    url.searchParams.append("amount", amount.toString());
    url.searchParams.append("category", openTriviaCategory.toString());
    url.searchParams.append("type", "multiple");
    url.searchParams.append("encode", "url3986"); // URL encoding to handle special characters

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OpenTriviaResponse = await response.json();
    
    // Handle API response codes
    if (data.response_code !== 0) {
      const errorMessage = this.getAPIErrorMessage(data.response_code);
      throw new Error(`Open Trivia DB API error: ${errorMessage} (code: ${data.response_code})`);
    }

    if (!data.results || data.results.length === 0) {
      throw new Error("No questions returned from API");
    }

    return data.results.map(result => this.transformAPIQuestion(result, categoryId));
  }

  /**
   * Transform Open Trivia Database question format to our Question format
   */
  private transformAPIQuestion(apiQuestion: OpenTriviaQuestion, categoryId: string): Question {
    // Decode URL-encoded strings
    const question = decodeURIComponent(apiQuestion.question);
    const correctAnswer = decodeURIComponent(apiQuestion.correct_answer);
    const incorrectAnswers = apiQuestion.incorrect_answers.map(answer => decodeURIComponent(answer));
    
    // Create options array and shuffle to randomize position
    const allOptions = [correctAnswer, ...incorrectAnswers];
    const shuffledOptions = this.shuffleArray([...allOptions]);
    
    // Find the correct answer index in shuffled array
    const correctAnswerIndex = shuffledOptions.indexOf(correctAnswer);
    
    // Map difficulty to our 1-3 scale
    const difficultyMap: Record<string, number> = {
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
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Get cached questions if they're still valid
   */
  private getCachedQuestions(cacheKey: string): Question[] | null {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now > cached.expiry) {
      // Cache expired but don't delete it yet (might be useful as fallback)
      return null;
    }
    
    return cached.questions;
  }

  /**
   * Cache questions with timestamp and expiry
   */
  private cacheQuestions(cacheKey: string, questions: Question[]): void {
    const now = Date.now();
    this.cache.set(cacheKey, {
      questions,
      timestamp: now,
      expiry: now + this.CACHE_DURATION
    });
    
    // Clean up expired cache entries periodically
    this.cleanupExpiredCache();
  }

  /**
   * Clean up expired cache entries to prevent memory bloat
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      // Only delete cache entries that are significantly old (2x expiry time)
      if (now > entry.expiry + this.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Get error message for Open Trivia Database API response codes
   */
  private getAPIErrorMessage(code: number): string {
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
  private getFallbackQuestions(categoryId: string, limit: number): Question[] {
    const fallbackQuestions: Record<string, InsertQuestion[]> = {
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
    
    return categoryQuestions.slice(0, limit).map(q => ({
      ...q,
      id: randomUUID(),
      difficulty: q.difficulty ?? 1 // Ensure difficulty is always a number
    }));
  }

  /**
   * Clear all cached questions (useful for testing or manual cache refresh)
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  public getCacheStats(): { totalEntries: number, validEntries: number, expiredEntries: number } {
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
}

export const triviaAPI = new TriviaAPIService();