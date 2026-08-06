import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Menu, X, ArrowLeft, Mail, Phone, MessageCircle, Flame } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginNavigation = async () => {
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      navigate(createPageUrl("Dashboard"));
    } else {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await base44.functions.invoke('submitContact', formData);
      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-card text-foreground font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <Link to={createPageUrl("PublicHome")} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-black tracking-wide text-foreground">APEX COACH</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <Link to={createPageUrl("PublicHome")} className="text-sm font-semibold tracking-wide text-muted-foreground hover:text-foreground transition">HOME</Link>
            <Link to={createPageUrl("About")} className="text-sm font-semibold tracking-wide text-muted-foreground hover:text-foreground transition">ABOUT</Link>
            <Link to={createPageUrl("Contact")} className="text-sm font-semibold tracking-wide text-foreground transition">CONTACT</Link>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <button onClick={handleLoginNavigation} className="px-6 py-2 border font-bold tracking-wide text-sm transition text-muted-foreground hover:text-foreground border-border rounded-lg">
              LOGIN
            </button>
          </div>

          <button className="lg:hidden text-muted-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden p-4 space-y-4 bg-card border-t border-border">
            <Link to={createPageUrl("PublicHome")} className="block text-sm font-semibold tracking-wide text-muted-foreground">HOME</Link>
            <Link to={createPageUrl("About")} className="block text-sm font-semibold tracking-wide text-muted-foreground">ABOUT</Link>
            <Link to={createPageUrl("Contact")} className="block text-sm font-semibold tracking-wide text-foreground">CONTACT</Link>
            <div className="pt-4 space-y-2 border-t border-border">
              <button onClick={handleLoginNavigation} className="w-full py-2 border font-bold tracking-wide text-sm text-muted-foreground border-border rounded-lg">LOGIN</button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold tracking-[0.3em] mb-3 text-primary">Get in touch</p>
            <h1 className="text-4xl lg:text-6xl font-black mb-6 text-foreground">
              CONTACT US
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-sans">
              Have questions about Apex Coach? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Contact Form */}
            <div className="bg-card border border-border rounded-3xl p-8 lg:p-10" style={{ fontFamily: "Inter, sans-serif" }}>
              <h2 className="text-2xl font-black text-foreground mb-8">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Name</label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      required
                      className="input-frosted h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Email Address</label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                      className="input-frosted h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Subject</label>
                  <Input
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    required
                    className="input-frosted h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Message</label>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Write your message here..."
                    required
                    className="input-frosted min-h-[160px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 font-black tracking-wide text-sm text-primary-foreground bg-primary transition rounded-xl hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? "SENDING..." : "SEND MESSAGE"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}