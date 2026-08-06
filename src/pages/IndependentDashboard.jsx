import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, ChevronRight, LayoutDashboard, Dumbbell, Utensils, MessageCircle, Settings, LogOut, ChevronDown, Upload, Camera, Loader2, PlaySquare, Target, Activity, Users2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function IndependentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ["clientProfile", user?.email],
    queryFn: async () => {
      const byEmail = await base44.entities.Client.filter({ email: user?.email });
      return byEmail.length > 0 ? byEmail[0] : null;
    },
    enabled: !!user?.email,
    staleTime: 300000,
  });
  const fileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [timelapseIndex, setTimelapseIndex] = useState(0);

  useEffect(() => {
    if (clientProfile && clientProfile.trainer_id !== null) {
      navigate('/ClientDashboard');
    }
  }, [clientProfile, navigate]);

  const { data: workoutPlans = [] } = useQuery({ queryKey: ["clientWorkouts", clientProfile?.id], queryFn: () => base44.entities.WorkoutPlan.filter({ client_id: clientProfile?.id }), enabled: !!clientProfile });
  const { data: mealPlans = [] } = useQuery({ queryKey: ["clientMeals", clientProfile?.id], queryFn: () => base44.entities.MealPlan.filter({ client_id: clientProfile?.id }), enabled: !!clientProfile });
  const { data: progressLogs = [] } = useQuery({ queryKey: ["progressLogs", clientProfile?.id], queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientProfile?.id }, "-date"), enabled: !!clientProfile });

  const allPhotos = progressLogs
    .filter(log => log.photo_urls && log.photo_urls.length > 0)
    .flatMap(log => (log.photo_urls || []).map(url => ({ url, date: log.date, logId: log.id })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !clientProfile) return;

    setIsUploadingPhoto(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      const today = new Date().toLocaleDateString('sv-SE');
      
      let log = progressLogs.find(l => l.date === today);
      
      if (log) {
        const currentPhotos = log.photo_urls || [];
        await base44.entities.ProgressLog.update(log.id, { photo_urls: [...currentPhotos, data.file_url] });
      } else {
        await base44.entities.ProgressLog.create({
          client_id: clientProfile.id,
          date: today,
          photo_urls: [data.file_url],
          trainer_id: null
        });
      }
      queryClient.invalidateQueries({ queryKey: ["progressLogs"] });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let interval;
    if (showTimelapse && allPhotos.length > 0) {
      interval = setInterval(() => {
        setTimelapseIndex(prev => (prev + 1) % allPhotos.length);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showTimelapse, allPhotos.length]);

  if (!user || !clientProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="text-foreground font-sans space-y-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-2 px-2">
        <h1 className="text-xl font-bold tracking-wide">Your training</h1>
      </div>

      {/* Top Stats Row */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="bg-background/80 backdrop-blur-xl rounded-2xl p-4 border border-border flex items-center gap-4 flex-1 min-w-[280px] shadow-2xl">
          <img src={clientProfile?.avatar_url || (clientProfile?.gender === 'female' ? "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" : "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix")} className="w-14 h-14 rounded-full border-2 border-border object-cover" alt="Avatar" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-base font-bold text-foreground tracking-wider">Welcome back</span>
            </div>
            <div className="text-xs text-muted-foreground">{clientProfile?.full_name}</div>
          </div>
        </div>

        <div className="bg-background/80 backdrop-blur-xl rounded-2xl px-6 py-4 border border-border flex flex-col justify-center shadow-2xl hidden sm:flex">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Dumbbell className="w-3 h-3"/> Workouts</p>
          <p className="text-xl font-bold text-primary">{workoutPlans.length}</p>
        </div>

        <div className="bg-background/80 backdrop-blur-xl rounded-2xl px-6 py-4 border border-border flex flex-col justify-center shadow-2xl hidden md:flex">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Utensils className="w-3 h-3"/> Meals</p>
          <p className="text-xl font-bold text-primary">{mealPlans.length}</p>
        </div>

        <Link to={createPageUrl("ClientWorkouts")}>
          <div className="bg-[#00E676] rounded-2xl px-8 py-4 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,230,118,0.4)] cursor-pointer hover:scale-105 transition-transform h-full">
            <p className="text-xs text-black font-bold uppercase tracking-wide mb-1">Start</p>
            <p className="text-xl font-black text-black">Workout</p>
          </div>
        </Link>
      </div>

      <Dialog open={showTimelapse} onOpenChange={setShowTimelapse}>
        <DialogContent className="max-w-2xl bg-black border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Progress Timelapse</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            {allPhotos.length > 0 && (
              <>
                <img 
                  src={allPhotos[timelapseIndex].url} 
                  className="w-full h-full object-contain"
                  alt="Timelapse Frame"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">
                  <p className="text-foreground font-bold tracking-wide text-sm">
                    {new Date(allPhotos[timelapseIndex].date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'})}
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Hero Card */}
      <div className="bg-background/80 backdrop-blur-xl rounded-3xl p-6 lg:p-10 border border-border shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-wide">Your Progress</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
          
          {/* Left Column: Image Grid */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between z-10">
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-col h-full shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-foreground flex items-center gap-2"><Camera className="w-4 h-4"/> Photos</h3>
                <div className="flex gap-2">
                  {allPhotos.length > 2 && (
                    <button onClick={() => setShowTimelapse(true)} className="p-1.5 bg-secondary hover:bg-accent rounded-lg transition" title="View Timelapse">
                      <PlaySquare className="w-4 h-4 text-primary" />
                    </button>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploadingPhoto}
                    className="p-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition disabled:opacity-50"
                  >
                    {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 overflow-y-auto max-h-[300px] scrollbar-thin pr-1">
                {allPhotos.map((photo, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-black">
                    <img src={photo.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={`Progress ${i}`} />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 backdrop-blur-sm">
                      <p className="text-[9px] text-center text-muted-foreground font-medium">
                        {new Date(photo.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                      </p>
                    </div>
                  </div>
                ))}
                {allPhotos.length === 0 && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Camera className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs text-center">No photos yet<br/>Upload your first!</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Features quick access */}
          <div className="lg:col-span-6 space-y-6 z-10 flex flex-col justify-center">
            
            <div className="grid grid-cols-2 gap-4">
              <Link to={createPageUrl("ClientJournal")} className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:border-primary/30 transition-all hover:-translate-y-1">
                <Target className="w-8 h-8 text-primary mb-4" />
                <h4 className="text-lg font-bold text-foreground mb-2">AI Journal</h4>
                <p className="text-xs text-muted-foreground">Reflect and get AI-powered insights.</p>
              </Link>
              
              <Link to={createPageUrl("ClientCommunity")} className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:border-purple-500/30 transition-all hover:-translate-y-1">
                <Users2 className="w-8 h-8 text-purple-400 mb-4" />
                <h4 className="text-lg font-bold text-foreground mb-2">Community</h4>
                <p className="text-xs text-muted-foreground">Connect with other solo users.</p>
              </Link>
            </div>
            
            {/* Daily habits Tracker */}
            <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-lg font-bold text-foreground">Daily habits</h4>
                  <p className="text-sm text-muted-foreground">Tracks</p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-x-2 gap-y-4">
                {/* Headers */}
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center text-[10px] text-muted-foreground font-bold uppercase">{day}</div>
                ))}
                
                {/* Grid Dots */}
                {Array.from({length: 4}).map((_, row) => (
                  <React.Fragment key={row}>
                    {Array.from({length: 7}).map((_, col) => {
                      const pastDays = (3 - row) * 7 + (6 - col);
                      const isCompleted = pastDays < (clientProfile?.current_streak || 0);
                      const isCurrent = pastDays === 0;
                      
                      return (
                        <div key={`${row}-${col}`} className="flex justify-center">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all
                            ${isCompleted ? 'border-[#00E676] bg-primary/20' : 
                              isCurrent ? 'border-white/30 bg-transparent animate-pulse' : 
                              'border-border bg-secondary'}`}>
                            {isCompleted && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          </div>
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}