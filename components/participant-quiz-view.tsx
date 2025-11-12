"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { submitAnswer } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw, Trophy, CheckCircle2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Leaderboard } from "@/components/leaderboard";

interface Session {
  id: string;
  status: "waiting" | "live" | "ended";
  current_question_id: string | null;
  room_code: string;
  quiz: {
    id: string;
    title: string;
    settings_json: any;
  };
}

interface Participant {
  id: string;
  name: string;
  score: number;
}

interface Option {
  id: string;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  text: string;
  type: "single" | "multi";
  timer_seconds: number | null;
  options: Option[];
  order_index: number;
}

interface ParticipantQuizViewProps {
  session: Session;
  participant: Participant;
  questions: Question[];
}

export function ParticipantQuizView({
  session: initialSession,
  participant: initialParticipant,
  questions,
}: ParticipantQuizViewProps) {
  const [session, setSession] = useState(initialSession);
  const [participant, setParticipant] = useState(initialParticipant);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(
    session.current_question_id
  );
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const currentQuestion = currentQuestionId
    ? questions.find((q) => q.id === currentQuestionId)
    : null;
  const settings = session.quiz?.settings_json || {};
  const leaderboardEnabled = settings.leaderboardEnabled !== false;

  // Real-time subscription for session updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`session:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload: { new: Session; }) => {
          const updatedSession = payload.new as Session;
          setSession(updatedSession);

          // Auto-advance to new question when host changes it
          if (updatedSession.current_question_id !== currentQuestionId) {
            setCurrentQuestionId(updatedSession.current_question_id);
            setSelectedOptions([]);
            setHasSubmitted(false);
            setTimeRemaining(null);
            setTimerExpired(false);
          }

          // If quiz just started, update to current question
          if (
            updatedSession.status === "live" &&
            session.status === "waiting"
          ) {
            setCurrentQuestionId(updatedSession.current_question_id);
            setSelectedOptions([]);
            setHasSubmitted(false);
            setTimeRemaining(null);
            setTimerExpired(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id, currentQuestionId, session.status]);

  // Real-time subscription for participant score updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`participant:${participant.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "participants",
          filter: `id=eq.${participant.id}`,
        },
        (payload: { new: Participant; }) => {
          const updatedParticipant = payload.new as Participant;
          setParticipant(updatedParticipant);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participant.id]);

  const handleSubmit = async () => {
    if (
      hasSubmitted ||
      selectedOptions.length === 0 ||
      session.status !== "live" ||
      !currentQuestion
    ) {
      return;
    }

    setHasSubmitted(true);

    const result = await submitAnswer(
      session.id,
      participant.id,
      currentQuestion.id,
      selectedOptions
    );

    if (result.error) {
      toast.error(result.error);
      setHasSubmitted(false);
    } else {
      toast.success("Answer submitted!");
    }
  };

  // Timer logic
  useEffect(() => {
    if (
      session.status !== "live" ||
      !currentQuestion ||
      !currentQuestion.timer_seconds ||
      hasSubmitted ||
      timerExpired
    ) {
      if (!currentQuestion?.timer_seconds || hasSubmitted || timerExpired) {
        setTimeRemaining(null);
      }
      return;
    }

    // Reset timer expired state when question changes
    setTimerExpired(false);
    setTimeRemaining(currentQuestion.timer_seconds);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTimerExpired(true);
          // Auto-submit when timer runs out if options are selected
          if (!hasSubmitted && selectedOptions.length > 0) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    session.status,
    currentQuestionId,
    currentQuestion?.timer_seconds,
    hasSubmitted,
  ]);

  // Check if already submitted for current question
  useEffect(() => {
    const checkSubmission = async () => {
      if (!currentQuestion || session.status !== "live") return;

      const supabase = createClient();
      const { data } = await supabase
        .from("submissions")
        .select("id")
        .eq("session_id", session.id)
        .eq("participant_id", participant.id)
        .eq("question_id", currentQuestion.id)
        .single();

      if (data) {
        setHasSubmitted(true);
        setTimerExpired(false);
      }
    };

    checkSubmission();
  }, [currentQuestionId, currentQuestion, session.id, participant.id, session.status]);

  // Check if there are more questions
  const currentQuestionIndex = currentQuestion
    ? questions.findIndex((q) => q.id === currentQuestion.id)
    : -1;
  const hasMoreQuestions = currentQuestionIndex >= 0 && currentQuestionIndex < questions.length - 1;
  const isLastQuestion = currentQuestionIndex >= 0 && currentQuestionIndex === questions.length - 1;

  const handleOptionToggle = (optionId: string) => {
    if (hasSubmitted || session.status !== "live" || !currentQuestion || timerExpired) return;

    if (currentQuestion.type === "single") {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Wait screen
  if (session.status === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <Trophy className="w-10 h-10 text-purple-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                QuizzyPop
              </h1>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Waiting for host to start
                </h2>
                <p className="text-gray-600">
                  The quiz will begin automatically when the host starts it.
                </p>
              </div>
              <Button
                onClick={handleReload}
                variant="outline"
                className="w-full h-12 border-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload
              </Button>
              <div className="pt-6 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Room Code:</span>
                  <span className="font-mono font-bold text-purple-600 text-lg tracking-wider">
                    {session.room_code}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Quiz: <span className="font-semibold text-gray-700">{session.quiz?.title || "Quiz"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Completed screen
  if (session.status === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <Trophy className="w-10 h-10 text-purple-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                QuizzyPop
              </h1>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="w-12 h-12 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Quiz Completed!
                </h2>
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8 border border-purple-100">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Your Score</p>
                  <p className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {participant.score ?? 0} / {questions.length}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {(participant.score ?? 0) === questions.length ? "Perfect score! 🎉" : "Great job!"}
                  </p>
                </div>
              </div>

              {leaderboardEnabled && (
                <div className="pt-4">
                  <Button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg"
                  >
                    {showLeaderboard ? "Hide" : "Show"} Leaderboard
                  </Button>
                  {showLeaderboard && (
                    <div className="mt-6">
                      <Leaderboard sessionId={session.id} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <Trophy className="w-10 h-10 text-purple-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                QuizzyPop
              </h1>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No more questions</h2>
            <p className="text-gray-600">Waiting for the quiz to complete...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-6 h-6 text-purple-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {session.quiz?.title || "Quiz"}
              </h1>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              Question{" "}
              <span className="text-purple-600 font-bold">
                {currentQuestion
                  ? questions.findIndex((q) => q.id === currentQuestion.id) + 1
                  : 0}
              </span>{" "}
              of <span className="text-gray-900 font-bold">{questions.length}</span>
            </p>
          </div>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-lg shadow-md">
              <Clock className="w-5 h-5" />
              <span>{timeRemaining}s</span>
            </div>
          )}
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 leading-tight">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOptions.includes(option.id);
              const isDisabled = hasSubmitted || session.status !== "live" || timerExpired;

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionToggle(option.id)}
                  disabled={isDisabled}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-purple-600 bg-gradient-to-r from-purple-50 to-blue-50 shadow-md"
                      : "border-gray-200 hover:border-purple-300 bg-white hover:bg-gray-50"
                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium text-base">{option.text}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {!hasSubmitted && !timerExpired && (
            <Button
              onClick={handleSubmit}
              disabled={
                selectedOptions.length === 0 || session.status !== "live"
              }
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedOptions.length === 0
                ? "Select an answer to submit"
                : "Submit Answer"}
            </Button>
          )}

          {timerExpired && !hasSubmitted && (
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                <p className="text-yellow-800 font-medium text-center flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time's up! {selectedOptions.length > 0 ? "Your answer was automatically submitted." : "No answer was selected."}
                </p>
              </div>
              {isLastQuestion ? (
                <Button
                  disabled
                  className="w-full h-14 bg-gray-300 hover:bg-gray-300 text-gray-600 text-lg font-medium cursor-not-allowed"
                >
                  Waiting for quiz to complete...
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full h-14 bg-gray-300 hover:bg-gray-300 text-gray-600 text-lg font-medium cursor-not-allowed"
                >
                  Waiting for next question...
                </Button>
              )}
            </div>
          )}

          {hasSubmitted && (
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                <p className="text-green-800 font-medium text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Answer submitted!
                </p>
              </div>
              {isLastQuestion ? (
                <Button
                  disabled
                  className="w-full h-14 bg-gray-300 hover:bg-gray-300 text-gray-600 text-lg font-medium cursor-not-allowed"
                >
                  Waiting for quiz to complete...
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full h-14 bg-gray-300 hover:bg-gray-300 text-gray-600 text-lg font-medium cursor-not-allowed"
                >
                  Waiting for next question...
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

