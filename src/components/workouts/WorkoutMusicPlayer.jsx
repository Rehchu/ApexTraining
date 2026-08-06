import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack, Music, Volume2, VolumeX } from "lucide-react";

const PLAYLISTS = {
  warmup: { name: "Warm-up Flow", color: "text-blue-400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  heavy_lift: { name: "Heavy Metal Lift", color: "text-red-500", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
  cardio: { name: "High BPM Cardio", color: "text-yellow-500", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  cooldown: { name: "Zen Cool-down", color: "text-emerald-400", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3" }
};

export default function WorkoutMusicPlayer({ currentPhase = "warmup" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  const activePlaylist = PLAYLISTS[currentPhase] || PLAYLISTS.warmup;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = activePlaylist.url;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
    }
  }, [currentPhase]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          console.log("Audio play failed:", e);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      if (duration > 0) {
        setProgress((current / duration) * 100);
      }
    }
  };

  const skip = (amount) => {
    if (audioRef.current) {
      audioRef.current.currentTime += amount;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <Card className="bg-black/60 border-zinc-800 backdrop-blur-xl">
      <CardContent className="p-4 flex items-center gap-4">
        <audio 
          ref={audioRef} 
          src={activePlaylist.url} 
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          loop
        />
        <div className={`p-3 rounded-full bg-secondary border border-zinc-800 flex-shrink-0 ${activePlaylist.color}`}>
          <Music className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-sm font-bold text-foreground truncate pr-2">{activePlaylist.name}</h4>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-foreground shrink-0" onClick={toggleMute}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-zinc-400 mb-2 truncate">Adaptive Soundscape</p>
          
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-foreground h-8 w-8 shrink-0" onClick={() => skip(-10)}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            className="bg-white text-black hover:bg-zinc-200 h-10 w-10 rounded-full shrink-0"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-foreground h-8 w-8 shrink-0" onClick={() => skip(10)}>
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}