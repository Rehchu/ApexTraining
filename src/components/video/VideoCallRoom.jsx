import React, { useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function VideoCallRoom({ open, onOpenChange, roomId, userName }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    if (!open || !roomId) return;

    const loadJitsiScript = () => {
      return new Promise((resolve) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => resolve(window.JitsiMeetExternalAPI);
        document.body.appendChild(script);
      });
    };

    let isMounted = true;

    loadJitsiScript().then((JitsiMeetExternalAPI) => {
      if (!isMounted || !containerRef.current) return;

      const domain = "meet.jit.si";
      const options = {
        roomName: roomId,
        width: "100%",
        height: "100%",
        parentNode: containerRef.current,
        userInfo: {
          displayName: userName || "Participant"
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            'e2ee'
          ],
        },
      };

      const api = new JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;

      api.addListener('videoConferenceLeft', () => {
        onOpenChange(false);
      });
    });

    return () => {
      isMounted = false;
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [open, roomId, userName, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full h-[80vh] p-0 overflow-hidden bg-black border-yellow-500/20 sm:rounded-2xl" hideCloseButton>
        <div ref={containerRef} className="w-full h-full bg-black flex items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Loading secure connection...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}