import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const typeColors = {
  personal_training: "bg-green-500/10 text-green-400 border-green-500/20",
  group_class: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  assessment: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  consultation: "bg-red-500/10 text-red-400 border-red-500/20"
};

import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

export default function UpcomingSession({ session, client, onJoinVideo }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-all group">
      <Avatar className="h-12 w-12 ring-2 ring-[#00D084]/20 shadow-sm">
        <AvatarImage src={client?.avatar_url} />
        <AvatarFallback className="bg-primary/20 text-primary font-medium">
          {client?.full_name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground truncate">
            {client?.full_name || session.client_name || "Unknown Client"}
          </p>
          <Badge className={cn("text-xs font-medium border-border text-muted-foreground", typeColors[session.type] || typeColors.personal_training)}>
            {session.type?.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {session.start_time} - {session.end_time}
          </span>
        </div>
      </div>
      
      <div className="text-right flex flex-col items-end justify-center gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            {format(new Date(session.date + 'T00:00:00'), "MMM d")}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(session.date + 'T00:00:00'), "EEEE")}
          </p>
        </div>
        {session.type === 'video_call' && session.video_room_id && (
          <Button 
            size="sm" 
            className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJoinVideo?.(session.video_room_id);
            }}
          >
            <Video className="w-3 h-3 mr-1" /> Join
          </Button>
        )}
      </div>
    </div>
  );
}