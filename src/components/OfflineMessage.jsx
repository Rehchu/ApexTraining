import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineMessage() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-[calc(env(safe-area-inset-top)+56px)] lg:top-0 left-0 right-0 z-[100] p-3 bg-red-600/90 backdrop-blur text-foreground shadow-lg flex items-center justify-center gap-2 text-sm font-medium border-b border-red-500"
        >
          <WifiOff className="w-4 h-4" />
          <span>You're offline — core features available, notifications resume when connected.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}