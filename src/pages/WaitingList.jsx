import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function WaitingList() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "client"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await base44.entities.WaitingList.create({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: "pending"
      });
      setSubmitted(true);
      toast.success("Successfully joined the waiting list!");
    } catch (error) {
      toast.error("Failed to join waiting list. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(6,6,8,0.95)', borderBottom: '1px solid rgba(212,175,55,0.2)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <Link to={createPageUrl("PublicHome")} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)' }}>
              <Flame className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-wide" style={{ background: 'linear-gradient(135deg, #f5c842, #d4a017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>APEX COACH</span>
          </Link>
          <Link to={createPageUrl("PublicHome")}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-accent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pt-24 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="p-8 sm:p-10 rounded-2xl" style={{ background: 'rgba(12,12,14,0.8)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            
            {submitted ? (
              <div className="text-center space-y-6 py-8 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black mb-2 tracking-wide text-foreground" style={{ fontFamily: "'Georgia', serif" }}>YOU'RE ON THE LIST</h2>
                  <p className="text-muted-foreground font-sans mt-2">We'll notify you as soon as a spot opens up or when the closed beta finishes.</p>
                </div>
                <Link to={createPageUrl("PublicHome")} className="block">
                  <Button className="w-full py-6 font-black tracking-wide text-sm text-black" style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)' }}>
                    RETURN HOME
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <p className="text-xs font-bold tracking-[0.3em] mb-3" style={{ color: '#d4a017' }}>CLOSED BETA</p>
                  <h2 className="text-3xl font-black mb-3" style={{ fontFamily: "'Georgia', serif", background: 'linear-gradient(135deg, #ffffff 0%, #f5c842 60%, #d4a017 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    JOIN THE WAITING LIST
                  </h2>
                  <p className="text-muted-foreground text-sm font-sans">
                    Reserve your spot for when we open up to the public.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 font-sans">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-muted-foreground">Full Name</Label>
                    <Input 
                      id="name" 
                      required 
                      placeholder="John Doe"
                      className="bg-card border-border text-foreground focus:border-[#d4a017]"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      placeholder="john@example.com"
                      className="bg-card border-border text-foreground focus:border-[#d4a017]"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">I am a...</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                      <SelectTrigger className="bg-card border-border text-foreground focus:ring-[#d4a017]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="client" className="focus:bg-secondary">Fitness Client</SelectItem>
                        <SelectItem value="trainer" className="focus:bg-secondary">Fitness Trainer / Coach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-6 mt-4 font-black tracking-wide text-sm text-black border-none hover:opacity-90 transition-opacity" 
                    style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)' }}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "JOIN WAITING LIST"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}