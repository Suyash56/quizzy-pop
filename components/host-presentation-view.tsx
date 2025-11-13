"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  createSession,
  updateSession,
  getParticipantsBySession,
  getSubmissionsByQuestion,
  calculateAndUpdateScores,
} from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Play,
  ChevronRight,
  Users,
  BarChart3,
  Trophy,
  CheckCircle2,
  Share2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Leaderboard } from "@/components/leaderboard";
import { ShareSessionModal } from "@/components/share-session-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Quiz {
  id: string;
  title: string;
  settings_json: any;
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

interface Participant {
  id: string;
  name: string;
  score: number;
}

interface HostPresentationViewProps {
  quiz: Quiz;
  questions: Question[];
  userId: string;
}

export function HostPresentationView({
  quiz,
  questions: initialQuestions,
  userId,
}: HostPresentationViewProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [sessionStatus, setSessionStatus] = useState<
    "waiting" | "live" | "ended"
  >("waiting");
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<
    Record<string, number>
  >({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const questions = initialQuestions;
  const currentQuestion = currentQuestionId
    ? questions.find((q) => q.id === currentQuestionId)
    : null;
  const settings = quiz.settings_json || {};
  const leaderboardEnabled = settings.leaderboardEnabled !== false;

  // Generate room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      const code = generateRoomCode();

      const result = await createSession({
        quiz_id: quiz.id,
        room_code: code,
      });

      if (result.error) {
        toast.error("Failed to create session: " + result.error);
        return;
      }

      if (result.data) {
        setSessionId(result.data.id);
        const restoredStatus = result.data.status || "waiting";
        setSessionStatus(restoredStatus);
        
        // Use the room code from the result (either existing or new)
        setRoomCode(result.data.room_code || code);
        
        // If restoring a live session, restore the current question
        if (restoredStatus === "live" && result.data.current_question_id) {
          setCurrentQuestionId(result.data.current_question_id);
        }
        
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [quiz.id]);

  // Real-time subscription for session updates
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload: { new: any; }) => {
          const updated = payload.new as any;
          setSessionStatus(updated.status);
          setCurrentQuestionId(updated.current_question_id || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Real-time subscription for participants
  useEffect(() => {
    if (!sessionId) return;

    const fetchParticipants = async () => {
      const result = await getParticipantsBySession(sessionId);
      if (result.data) {
        setParticipants(result.data);
      }
    };

    fetchParticipants();

    const supabase = createClient();
    const channel = supabase
      .channel(`participants:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Real-time subscription for submissions using Supabase events only
  useEffect(() => {
    if (!sessionId || !currentQuestionId || sessionStatus !== "live") {
      setSubmissionCounts({});
      return;
    }

    let isMounted = true;
    let isFetching = false;

    const fetchSubmissions = async () => {
      if (!isMounted || isFetching) return;
      
      isFetching = true;
      try {
        const result = await getSubmissionsByQuestion(sessionId, currentQuestionId);
        if (!isMounted) return;

        if (result.data) {
          const counts: Record<string, number> = {};
          result.data.forEach((submission: any) => {
            const optionId = submission.option_id;
            counts[optionId] = (counts[optionId] || 0) + 1;
          });
          setSubmissionCounts(counts);
        } else if (result.error) {
          console.error("Error fetching submissions:", result.error);
        }
      } catch (error) {
        console.error("Exception in fetchSubmissions:", error);
      } finally {
        isFetching = false;
      }
    };

    // Initial fetch
    fetchSubmissions();

    const supabase = createClient();
    const channel = supabase
      .channel(`submissions:${sessionId}:${currentQuestionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submissions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: { new: any }) => {
          // Only update if the submission is for the current question
          if (isMounted && payload.new && payload.new.question_id === currentQuestionId) {
            // Fetch updated counts when new submission arrives
            fetchSubmissions();
          }
        }
      )
      .subscribe((status: string) => {
        console.log("🔔 Subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to submissions real-time events");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel subscription error");
        } else if (status === "TIMED_OUT") {
          console.error("⏱️ Subscription timed out");
        } else if (status === "CLOSED") {
          console.warn("⚠️ Subscription closed");
        }
      });
  

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentQuestionId, sessionStatus]);

  const handleStartQuiz = async () => {
    if (!sessionId || questions.length === 0) return;

    setIsStarting(true);
    const firstQuestionId = questions[0].id;
    const result = await updateSession({
      session_id: sessionId,
      status: "live",
      current_question_id: firstQuestionId,
    });

    setIsStarting(false);

    if (result.error) {
      toast.error("Failed to start quiz: " + result.error);
    } else {
      toast.success("Quiz started!");
      setSessionStatus("live");
      setCurrentQuestionId(firstQuestionId);
    }
  };

  const handleNextQuestion = async () => {
    if (!sessionId || !currentQuestion) return;

    const currentIndex = questions.findIndex((q) => q.id === currentQuestion.id);
    if (currentIndex >= questions.length - 1) return;

    const nextQuestion = questions[currentIndex + 1];
    const result = await updateSession({
      session_id: sessionId,
      current_question_id: nextQuestion.id,
    });

    if (result.error) {
      toast.error("Failed to advance question: " + result.error);
    } else {
      setCurrentQuestionId(nextQuestion.id);
      setSubmissionCounts({});
    }
  };

  const handleCompleteQuiz = async () => {
    if (!sessionId) return;

    toast.loading("Calculating scores...", { id: "calculating" });
    
    const result = await calculateAndUpdateScores(sessionId);
    if (result.error) {
      toast.error("Failed to complete quiz: " + result.error, { id: "calculating" });
    } else {
      toast.success("Quiz completed! Scores calculated.", { id: "calculating" });
      setSessionStatus("ended");
      // Refresh participants to show updated scores
      const participantsResult = await getParticipantsBySession(sessionId);
      if (participantsResult.data) {
        setParticipants(participantsResult.data);
      }
    }
  };

  const handleRestartQuiz = async () => {
    const code = generateRoomCode();

    const result = await createSession({
      quiz_id: quiz.id,
      room_code: code,
    });

    if (result.error) {
      toast.error("Failed to start new session: " + result.error);
      return;
    }

    if (result.data) {
      setSessionId(result.data.id);
      setSessionStatus("waiting");
      setRoomCode(result.data.room_code || code);
      setCurrentQuestionId(null);
      setParticipants([]);
      setSubmissionCounts({});
      toast.success("New session created! Ready to start.");
    }
  };

  if (isLoading || !sessionId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header Skeleton */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <div className="h-8 w-32 bg-gray-700 rounded mb-2 animate-pulse"></div>
              <div className="h-4 w-56 bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-20 bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-10 w-32 bg-purple-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Main Content - Waiting to Start Skeleton */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-20">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                {/* Title */}
                <div className="h-10 w-64 bg-gray-700 rounded mx-auto mb-4 animate-pulse"></div>
                
                {/* Instructions */}
                <div className="h-5 w-full max-w-md bg-gray-700 rounded mx-auto mb-6 animate-pulse"></div>
                
                {/* Room Code Box */}
                <div className="bg-gray-700 rounded-lg p-6 mb-6">
                  <div className="h-4 w-28 bg-gray-600 rounded mx-auto mb-3 animate-pulse"></div>
                  <div className="h-12 w-48 bg-gray-600 rounded mx-auto animate-pulse"></div>
                </div>
                
                {/* Participants Count */}
                <div className="text-left">
                  <div className="h-4 w-56 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-gray-400 text-sm mt-1">
              Room Code: <span className="font-mono font-bold text-white">{roomCode}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">{participants.length}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-gray-800 border-gray-700 text-white">
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg mb-3">Participants</h4>
                  {participants.length === 0 ? (
                    <p className="text-gray-400 text-sm">No participants yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 bg-gray-700 rounded-lg"
                        >
                          <span className="text-sm font-medium text-white">{p.name}</span>
                          <span className="text-purple-400 font-semibold text-sm">
                            {p.score ?? 0} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              onClick={() => setShowShareModal(true)}
              variant="outline"
              className="border-gray-600 text-gray-300 bg-gray-700 text-white hover:bg-gray-600 hover:text-white cursor-pointer"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            {sessionStatus === "waiting" && (
              <Button
                onClick={handleStartQuiz}
                disabled={isStarting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Play className="w-4 h-4 mr-2" />
                {isStarting ? "Starting..." : "Start Quiz"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {sessionStatus === "waiting" && (
          <div className="text-center py-20">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                <h2 className="text-3xl font-bold mb-4">Waiting to Start</h2>
                <p className="text-gray-400 mb-6">
                  Share the room code with participants. Click "Start Quiz" when
                  everyone is ready.
                </p>
                <div className="bg-gray-700 rounded-lg p-6 mb-6">
                  <p className="text-sm text-gray-400 mb-2">Room Code</p>
                  <p className="text-4xl font-mono font-bold text-purple-400">
                    {roomCode}
                  </p>
                </div>
                <div className="text-left space-y-2">
                  <p className="text-sm text-gray-400">
                    Participants joined: <span className="text-white font-semibold">{participants.length}</span>
                  </p>
                  {participants.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400 mb-2">Participants:</p>
                      <div className="flex flex-wrap gap-2">
                        {participants.map((p) => (
                          <span
                            key={p.id}
                            className="bg-purple-600 px-3 py-1 rounded-full text-sm"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {sessionStatus === "live" && currentQuestion && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Question Display */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-gray-400 text-sm">
                      Question{" "}
                      {currentQuestion
                        ? questions.findIndex((q) => q.id === currentQuestion.id) + 1
                        : 0}{" "}
                      of {questions.length}
                    </span>
                    {currentQuestion.timer_seconds && (
                      <span className="bg-red-600 px-3 py-1 rounded text-sm font-semibold">
                        {currentQuestion.timer_seconds}s timer
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-6 text-white">
                    {currentQuestion.text}
                  </h2>

                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const count = submissionCounts[option.id] || 0;
                      const percentage =
                        participants.length > 0
                          ? Math.round((count / participants.length) * 100)
                          : 0;

                      return (
                        <div
                          key={option.id}
                          className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white">{option.text}</span>
                            <span className="text-purple-400 font-semibold">
                              {count} votes
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                option.is_correct
                                  ? "bg-green-500"
                                  : "bg-purple-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          {option.is_correct && (
                            <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Correct answer</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex gap-3">
                    {currentQuestion &&
                    questions.findIndex((q) => q.id === currentQuestion.id) <
                      questions.length - 1 ? (
                      <Button
                        onClick={handleNextQuestion}
                        className="bg-purple-600 hover:bg-purple-700 flex-1"
                      >
                        Next Question
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCompleteQuiz}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                      >
                        Complete Quiz
                        <Trophy className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Participants */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                    <Users className="w-5 h-5" />
                    Participants ({participants.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-gray-700 rounded"
                      >
                        <span className="text-sm text-white">{p.name}</span>
                        <span className="text-purple-400 font-semibold text-sm">
                          {p.score ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Leaderboard */}
              {leaderboardEnabled && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2 text-white">
                        <Trophy className="w-5 h-5" />
                        Leaderboard
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLeaderboard(!showLeaderboard)}
                        className="text-gray-400 hover:text-white"
                      >
                        {showLeaderboard ? "Hide" : "Show"}
                      </Button>
                    </div>
                    {showLeaderboard && <Leaderboard sessionId={sessionId} />}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {sessionStatus === "ended" && (
          <div className="text-center py-20">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-4">Quiz Completed!</h2>
                  <p className="text-gray-400 mb-6">
                    All scores have been calculated.
                  </p>
                  <Leaderboard sessionId={sessionId} />
                  <div className="mt-6 flex gap-4 justify-center">
                    <Link href="/dashboard">
                      <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                      </Button>
                    </Link>
                    <Button
                      onClick={handleRestartQuiz}
                      className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Restart Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Share Session Modal */}
      <ShareSessionModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        quizId={quiz.id}
        quizTitle={quiz.title}
        roomCode={roomCode}
      />
    </div>
  );
}

