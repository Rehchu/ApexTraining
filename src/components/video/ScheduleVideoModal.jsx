import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarDays, Clock, Video } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ScheduleVideoModal({ open, onOpenChange, clientId, clientName, trainerId, onSuccess }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const timeSlots = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    timeSlots.push(`${hour}:00`, `${hour}:15`, `${hour}:30`, `${hour}:45`);
  }

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const roomId = `apex-coach-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const newSession = await base44.entities.Session.create({
        client_id: clientId,
        client_name: clientName,
        trainer_id: trainerId,
        date: date,
        start_time: startTime,
        end_time: endTime,
        type: "video_call",
        status: "scheduled",
        video_room_id: roomId
      });

      // Send an automated message about the scheduled call
      const conversationId = [trainerId, clientId].sort().join("-");
      await base44.entities.Message.create({
        conversation_id: conversationId,
        sender_id: trainerId,
        sender_name: "System",
        receiver_id: clientId,
        receiver_name: clientName,
        content: `📹 A live video coaching session has been scheduled for ${date} at ${startTime}.`,
        timestamp: new Date().toISOString(),
        read: false
      });

      toast.success("Video session scheduled!");
      onSuccess?.(newSession);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to schedule session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background text-foreground border-yellow-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Video className="w-5 h-5 text-yellow-500" />
            Schedule Live Coaching
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSchedule} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Date</Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="pl-9 bg-secondary border-border text-foreground block w-full [color-scheme:dark]" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground max-h-[300px]">
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground max-h-[300px]">
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-yellow-600 hover:bg-yellow-700 text-foreground font-bold">
              {isLoading ? "Scheduling..." : "Schedule Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}