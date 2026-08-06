import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIosPrompt, setIsIosPrompt] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    
    // Check if already installed on iOS
    const isInStandaloneMode = () => {
      return ('standalone' in window.navigator) && window.navigator.standalone;
    };

    // If it's iOS and not already installed, show the iOS specific prompt
    if (isIos() && !isInStandaloneMode()) {
      setIsIosPrompt(true);
      setShowPrompt(true);
    }

    // Android / Chrome standard PWA prompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-emerald-200 bg-emerald-50 z-40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-900">Install App</h3>
              <p className="text-sm text-emerald-700 mt-1">Get offline access and faster loading</p>
            </div>
          </div>
          <button onClick={() => setShowPrompt(false)} className="text-emerald-600 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {isIosPrompt ? (
          <div className="text-sm text-emerald-800 bg-secondary0 p-3 rounded-md border border-emerald-100">
            To install: tap the <strong>Share</strong> icon below and select <strong>Add to Home Screen</strong>.
          </div>
        ) : (
          <Button onClick={handleInstall} className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground text-sm">
            Install Now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}