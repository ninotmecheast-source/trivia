import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "./lib/queryClient";
import type { GameSession, InsertGameSession } from "@shared/schema";

interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export default function TriviaGame() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [currentGameSession, setCurrentGameSession] =
    useState<GameSession | null>(null);

  const { toast } = useToast();

  const createGameSessionMutation = useMutation({
    mutationFn: async (sessionData: InsertGameSession) => {
      const response = await apiRequest("POST", "/api/game-sessions", sessionData);
      return response.json();
    },
    onSuccess: (data: GameSession) => setCurrentGameSession(data),
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to create game session.",
        variant: "destructive",
      }),
  });

  const updateGameSessionMutation = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<GameSession> }) => {
      const response = await apiRequest("PATCH", `/api/game-sessions/${sessionId}`, updates);
      return response.json();
    },
  });

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      // Fetch a single question from our own API instead of calling Open Trivia DB directly.
      // Using our API centralizes question caching, decoding, and ensures consistent data
      // models across client and server.
      const res = await apiRequest("GET", "/api/categories/general/questions?limit=1");
      const data = await res.json();
      const q = data[0];
      if (!q) {
        throw new Error("No question returned");
      }
      // Build our internal representation. Our API returns an options array and the index
      // of the correct answer. Separate the correct answer and incorrect answers for local state.
      const correctAnswerText: string = q.options[q.correctAnswer];
      const incorrectAnswers: string[] = q.options.filter((_: string, idx: number) => idx !== q.correctAnswer);
      // Add a pass option and shuffle all answers for display
      const allAnswers = [...q.options, "Pass Question"].sort(() => Math.random() - 0.5);
      setQuestion({ question: q.question, correct_answer: correctAnswerText, incorrect_answers: incorrectAnswers } as Question);
      setAnswers(allAnswers);
    } catch (err) {
      console.error("Error fetching question:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const startSession = async () => {
      // Create a new game session. Use the "general" category as default
      // since this client currently fetches questions from that category. If
      // category selection is added later, update this accordingly.
      const sessionData: InsertGameSession = {
        categoryId: "general",
        totalQuestions: 0,
        startTime: new Date().toISOString(),
        score: 0,
        correctAnswers: 0,
        endTime: null,
        questionResults: null,
      };
      createGameSessionMutation.mutate(sessionData);
    };

    startSession();
    fetchQuestion();
  }, []);

  const handleAnswer = (answer: string) => {
    if (!question) return;

    let newScore = score;
    let newCorrect = correctAnswers;

    if (answer === question.correct_answer) {
      newScore += 100;
      newCorrect += 1;
      setScore(newScore);
      setCorrectAnswers(newCorrect);
      setLastAnswer("✅ Correct!");
    } else if (answer === "Pass Question") {
      setLastAnswer("⏭️ Passed!");
    } else {
      setWrong((w) => w + 1);
      setLastAnswer(`❌ Wrong! Correct was: ${question.correct_answer}`);
    }

    if (currentGameSession) {
      updateGameSessionMutation.mutate({
        sessionId: currentGameSession.id,
        updates: { score: newScore, correctAnswers: newCorrect },
      });
    }

    fetchQuestion();
  };

  if (loading) return <h2>Loading...</h2>;
  
  return (

    
    <div>
      <h1>How to Engineer Trivia</h1>
      <p>✅ Correct: {correctAnswers} | ❌ Wrong: {wrong} | 🏆 Score: {score}</p>
      {lastAnswer && <p><em>{lastAnswer}</em></p>}

      {question && (
        <>
          <h2 dangerouslySetInnerHTML={{ __html: question.question }} />
          {answers.map((ans, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(ans)}
              style={{ display: "block", margin: "5px 0" }}
              dangerouslySetInnerHTML={{ __html: ans }}
            />
          ))}
        </>
      )}
      <footer
        style={{
          textAlign: "left",
          padding: "10px 20px",
          marginTop: "20px",
          fontSize: "13px",
          borderTop: "1px solid #eee",
        }}
      >
        <p style={{ marginBottom: "8px" }}>
          Keep our servers ad-free! – N. Thomas ▲
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Venmo Button */}
          <a
            href="https://venmo.com/Nino-Thomas"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button
              style={{
                background: "#3D95CE",
                color: "white",
                padding: "4px 8px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Venmo
            </button>
          </a>

          {/* PayPal Button */}
          <a
            href="https://www.paypal.com/donate/?business=PMPVTQNGJ7ZDN&"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button
              style={{
                background: "#0070ba",
                color: "white",
                padding: "4px 8px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              PayPal
            </button>
          </a>

          {/* News Link */}
          <a href="/news" rel="noopener noreferrer">
            <button
              style={{
                background: "#444",
                color: "white",
                padding: "4px 8px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              📰 News
            </button>
          </a>

          {/* Stock Trading Simulator */}
          <a href="/stocktrading" rel="noopener noreferrer">
            <button
              style={{
                background: "#28a745",
                color: "white",
                padding: "4px 8px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              📈 Stock Trading
            </button>
            
          </a>
          {/* RSS Link */}
          <a href="/rss.xml" target="_blank" rel="noopener noreferrer">
            <button
              style={{
                background: "#f26522",
                color: "white",
                padding: "4px 8px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              📡 RSS
            </button>
          </a>
        </div>
      </footer>

    </div>
    
  );
  
}
