import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CommunityLeaderboard({ trainerId, currentClientId, isTrainer = false }) {
  const { data: clients = [] } = useQuery({
    queryKey: ["leaderboard", trainerId],
    queryFn: () => base44.entities.Client.filter({ trainer_id: trainerId }),
    enabled: !!trainerId
  });

  // Sort clients by level descending, then xp descending
  const sortedClients = [...clients].sort((a, b) => {
    const levelA = a.pet_state?.level || 1;
    const levelB = b.pet_state?.level || 1;
    if (levelB !== levelA) return levelB - levelA;
    const xpA = a.pet_state?.xp || 0;
    const xpB = b.pet_state?.xp || 0;
    return xpB - xpA;
  });

  return (
    <Card className="glass-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-bold text-foreground">Community Leaderboard</h3>
      </div>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5">
          {sortedClients.map((client, index) => {
            const isCurrentUser = client.id === currentClientId;
            let RankIcon = null;
            if (index === 0) RankIcon = <Crown className="w-5 h-5 text-yellow-400" />;
            else if (index === 1) RankIcon = <Medal className="w-5 h-5 text-muted-foreground" />;
            else if (index === 2) RankIcon = <Medal className="w-5 h-5 text-amber-600" />;

            return (
              <div key={client.id} className={`p-4 flex items-center gap-3 ${isCurrentUser ? 'bg-secondary' : 'hover:bg-accent'} transition-colors`}>
                <div className="w-6 text-center font-bold text-muted-foreground">
                  {RankIcon ? RankIcon : `#${index + 1}`}
                </div>
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={client.avatar_url} />
                  <AvatarFallback className="bg-secondary text-foreground">{client.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isCurrentUser ? 'text-green-400' : 'text-foreground'}`}>
                    {client.full_name} {isCurrentUser && "(You)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lvl {client.pet_state?.level || 1} {client.pet_state?.type || "dragon"} • {client.pet_state?.xp || 0} XP
                  </p>
                </div>
              </div>
            );
          })}
          {sortedClients.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No clients on the leaderboard yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}