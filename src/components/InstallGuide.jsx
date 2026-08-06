import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, MonitorSmartphone, Apple, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InstallGuide() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsInstalled(isStandalone);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(userAgent));

    // Listen for prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for install event
    const installedHandler = () => {
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <MonitorSmartphone className="w-5 h-5 text-emerald-400" />
          App Installation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-foreground text-sm">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary">
          <div>
            <p className="font-medium text-foreground">Installation Status</p>
            <p className="text-xs text-muted-foreground mt-1">Once installed, your app feels more native and loads faster.</p>
          </div>
          {isInstalled ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Installed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-yellow-400 font-medium px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20">
              <AlertCircle className="w-4 h-4" /> Not Installed
            </span>
          )}
        </div>

        {!isInstalled && (
          <div className="space-y-4 mt-4">
            {isIos ? (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-semibold mb-2">
                  <Apple className="w-5 h-5" /> iOS (Safari)
                </div>
                <p>1. Tap the <strong>Share</strong> icon (square with upward arrow at bottom).</p>
                <p>2. Scroll down and select <strong>Add to Home Screen</strong>.</p>
                <p>3. Tap <strong>Add</strong> in the top right.</p>
                <div className="p-2 bg-blue-900/40 rounded border border-blue-500/20 mt-2">
                  <p className="text-xs text-blue-300 font-medium">Important: Push features only work after adding to home screen, not in the browser tab.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <MonitorSmartphone className="w-5 h-5" /> Android / Chrome
                </div>
                {deferredPrompt ? (
                  <Button onClick={handleInstall} className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground shadow-lg shadow-emerald-900/20">
                    <Download className="w-4 h-4 mr-2" />
                    Install App Now
                  </Button>
                ) : (
                  <p>To install: Tap the three-dot menu ⋮ in the top-right &gt; <strong>Install app</strong> or <strong>Add to home screen</strong> &gt; Add/Install.</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}