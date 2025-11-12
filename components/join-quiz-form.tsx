"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { joinSession, getSessionByRoomCode } from "@/app/actions/session";
import { Loader2, Trophy, User, Hash, LogIn } from "lucide-react";

interface JoinQuizFormProps {
  quizId: string;
  quizTitle: string;
}

export function JoinQuizForm({ quizId, quizTitle }: JoinQuizFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!roomCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }

    setIsJoining(true);

    // First, get session by room code
    const sessionResult = await getSessionByRoomCode(roomCode.trim().toUpperCase());

    if (sessionResult.error || !sessionResult.data) {
      setIsJoining(false);
      toast.error("Invalid room code. Please check and try again.");
      return;
    }

    const session = sessionResult.data;

    // Verify session is for this quiz
    if (session.quiz_id !== quizId) {
      setIsJoining(false);
      toast.error("Room code does not match this quiz");
      return;
    }

    // Join the session
    const joinResult = await joinSession(session.id, name.trim());

    if (joinResult.error || !joinResult.data) {
      setIsJoining(false);
      toast.error(joinResult.error || "Failed to join session");
      return;
    }

    toast.success("Successfully joined!");
    router.push(`/play/${session.id}?participantId=${joinResult.data.id}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Trophy className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              QuizzyPop
            </h1>
          </div>
          <p className="text-gray-600 text-sm">Enter the quiz room to participate</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Join Quiz
            </h2>
            <p className="text-lg text-purple-600 font-medium">{quizTitle}</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Your Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isJoining}
                  className="pl-10 h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomCode" className="text-sm font-medium text-gray-700">
                Room Code
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="roomCode"
                  type="text"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  disabled={isJoining}
                  className="pl-10 h-12 font-mono text-center text-xl tracking-[0.3em] font-bold border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg bg-gray-50"
                  maxLength={8}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Ask the host for the room code
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all font-medium text-base"
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Join Quiz
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

