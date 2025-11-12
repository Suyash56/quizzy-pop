"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getParticipantsBySession } from "@/app/actions/session";
import { Trophy, Medal, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Participant {
  id: string;
  name: string;
  score: number;
}

interface LeaderboardProps {
  sessionId: string;
}

export function Leaderboard({ sessionId }: LeaderboardProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchParticipants = async () => {
    const result = await getParticipantsBySession(sessionId);
    if (result.data) {
      setParticipants(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchParticipants();

    // Real-time subscription for participant updates
    const supabase = createClient();
    const channel = supabase
      .channel(`leaderboard:${sessionId}`)
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">Loading leaderboard...</p>
        </CardContent>
      </Card>
    );
  }

  if (participants.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">No participants yet</p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                index === 0
                  ? "bg-yellow-50 border-2 border-yellow-200"
                  : index === 1
                  ? "bg-gray-50 border-2 border-gray-200"
                  : index === 2
                  ? "bg-amber-50 border-2 border-amber-200"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 text-center font-bold text-gray-600">
                  {index + 1}
                </div>
                {getRankIcon(index)}
                <span className="font-medium text-gray-900">
                  {participant.name}
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-purple-600">
                  {participant.score ?? 0}
                </span>
                <span className="text-sm text-gray-500 ml-1">pts</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

