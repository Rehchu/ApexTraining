import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, Search, Image, Loader2, X, ArrowLeft, Video, CalendarPlus, Trash2 } from "lucide-react";
import ScheduleVideoModal from "@/components/video/ScheduleVideoModal";
import VideoCallRoom from "@/components/video/VideoCallRoom";
import { cn } from "@/lib/utils";

const safeDateParse = (d) => {
  if (!d) return new Date();
  let str = d;
  if (typeof str === 'string') {
    str = str.replace(' ', 'T');
    if (!str.endsWith('Z') && !str.includes('+') && str.length > 10) str += 'Z';
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function Messages() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientProfile, setClientProfile] = useState(null);
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const clients = await base44.entities.Client.filter({ email: userData.email });
      if (clients.length > 0) {
        setClientProfile(clients[0]);
        if (clients[0].trainer_id) {
          const conversationId = [userData.id, clients[0].trainer_id].sort().join("-");
          setSelectedConversation(conversationId);
        }
      }
    };
    loadUser();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: () => base44.entities.Client.filter({ trainer_id: user?.id }),
    enabled: !!user && !clientProfile,
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ["all-trainers", user?.id],
    queryFn: async () => {
      if (!user?.id || clientProfile) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.id !== user.id && (u.role === 'trainer' || u.role === 'admin'));
    },
    enabled: !!user && !clientProfile,
  });

  const { data: allPlatformClients = [] } = useQuery({
    queryKey: ["all-platform-clients", user?.id],
    queryFn: async () => {
      if (!user?.id || clientProfile || user?.role !== 'admin') return [];
      return base44.entities.Client.list('-created_date', 500);
    },
    enabled: !!user && !clientProfile && user?.role === 'admin',
  });

  const { data: otherClients = [] } = useQuery({
    queryKey: ["other-clients", clientProfile?.trainer_id],
    queryFn: async () => {
      if (!clientProfile?.trainer_id) return [];
      const allClients = await base44.entities.Client.filter({ trainer_id: clientProfile.trainer_id });
      return allClients.filter(c => c.user_id !== user?.id);
    },
    enabled: !!clientProfile?.trainer_id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedConversation],
    queryFn: () => base44.entities.Message.filter({ conversation_id: selectedConversation }, "-created_date"),
    enabled: !!selectedConversation,
    refetchInterval: 15000, // near-live: pull new messages every 15s while a chat is open
  });

  useEffect(() => {
    if (!selectedConversation) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === "create" && event.data.conversation_id === selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    });
    return unsubscribe;
  }, [selectedConversation, queryClient]);

  const { data: allMessages = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const msgs = await base44.entities.Message.list("-created_date", 1000);
      return msgs.filter(m => m.sender_id === user.id || m.receiver_id === user.id);
    },
    enabled: !!user,
  });

  const conversations = React.useMemo(() => {
    const convMap = new Map();
    allMessages.forEach(msg => {
      if (!convMap.has(msg.conversation_id)) {
        convMap.set(msg.conversation_id, {
          id: msg.conversation_id,
          otherUserId: msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id,
          otherUserName: msg.sender_id === user?.id ? msg.receiver_name : msg.sender_name,
          lastMessage: msg.content,
          lastMessageTime: msg.created_date,
          unreadCount: 0
        });
      }
      if (!msg.read && msg.receiver_id === user?.id) {
        convMap.get(msg.conversation_id).unreadCount++;
      }
    });
    return Array.from(convMap.values()).sort((a, b) => safeDateParse(b.lastMessageTime) - safeDateParse(a.lastMessageTime));
  }, [allMessages, user]);

  const markAsReadMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => base44.entities.Message.update(id, { read: true }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  useEffect(() => {
    if (messages.length > 0 && user) {
      const unread = messages.filter(m => !m.read && m.receiver_id === user.id).map(m => m.id);
      if (unread.length > 0) markAsReadMutation.mutate(unread);
    }
  }, [messages, user]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const message = await base44.entities.Message.create(data);
      try {
        await base44.entities.Notification.create({
          user_id: data.receiver_id, type: 'message', title: 'New message',
          message: `${data.sender_name}: ${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}`,
          link: '/Messages'
        });
      } catch {}
      return message;
    },
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ["messages", selectedConversation] });
      const previousMessages = queryClient.getQueryData(["messages", selectedConversation]);
      queryClient.setQueryData(["messages", selectedConversation], (old) => {
        return [{ id: `temp-${Date.now()}`, ...newMessage, created_date: new Date().toISOString() }, ...(old || [])];
      });
      setMessageContent("");
      setAttachedMedia([]);
      return { previousMessages };
    },
    onError: (err, newMsg, context) => {
      queryClient.setQueryData(["messages", selectedConversation], context.previousMessages);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleMediaUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;
    setIsUploadingMedia(true);
    try {
      const newMedia = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { data } = await base44.integrations.Core.UploadFile({ file });
        newMedia.push({ url: data.file_url, name: file.name, type: file.type.startsWith('image/') ? 'image' : 'video' });
      }
      setAttachedMedia([...attachedMedia, ...newMedia]);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const getConversationInfo = () => {
    if (!selectedConversation) return null;
    const existing = conversations.find(c => c.id === selectedConversation);
    if (existing) return existing;
    const allPeople = [...clients, ...otherClients, ...trainers, ...allPlatformClients];
    const person = allPeople.find(p => [user.id, p.user_id || p.id].sort().join("-") === selectedConversation);
    if (person) return { id: selectedConversation, otherUserId: person.user_id || person.id, otherUserName: person.full_name, lastMessage: "", lastMessageTime: new Date().toISOString(), unreadCount: 0 };
    return null;
  };

  const { data: upcomingVideoSessions = [] } = useQuery({
    queryKey: ["upcomingVideoSessions", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation || !user) return [];
      const convInfo = getConversationInfo();
      if (!convInfo) return [];
      const isClient = !!clientProfile;
      let clientId;
      if (isClient) {
        clientId = clientProfile.id;
      } else {
        const client = clients.find(c => c.user_id === convInfo.otherUserId || c.id === convInfo.otherUserId);
        if (!client) return [];
        clientId = client.id;
      }
      const trainerId = isClient ? convInfo.otherUserId : user.id;
      const sessions = await base44.entities.Session.filter({
        client_id: clientId, trainer_id: trainerId, type: "video_call", status: "scheduled"
      });
      return sessions.filter(s => {
        const sessionDate = safeDateParse(s.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return sessionDate >= today;
      }).sort((a, b) => safeDateParse(a.date) - safeDateParse(b.date));
    },
    enabled: !!selectedConversation && !!user,
    refetchInterval: 60000,
  });

  const handleJoinCall = (roomId) => {
    setActiveRoomId(roomId);
    setVideoCallOpen(true);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageContent.trim() && attachedMedia.length === 0) return;
    if (!selectedConversation || !user) return;
    const convInfo = getConversationInfo();
    let receiverId = convInfo?.otherUserId;
    let receiverName = convInfo?.otherUserName;
    if (!receiverId && selectedConversation) {
      const ids = selectedConversation.split("-");
      receiverId = ids.find(id => id !== user.id);
      if (!receiverName) {
        const client = [...clients, ...otherClients].find(c => (c.user_id || c.id) === receiverId);
        const trainer = trainers.find(t => t.id === receiverId);
        receiverName = client?.full_name || trainer?.full_name || "User";
      }
    }
    if (!receiverId) return;
    sendMessageMutation.mutate({
      conversation_id: selectedConversation, sender_id: user.id,
      sender_name: clientProfile ? clientProfile.full_name : user.full_name,
      receiver_id: receiverId, receiver_name: receiverName,
      content: messageContent.trim(), media_urls: attachedMedia.map(m => m.url),
      timestamp: new Date().toISOString(), read: false
    });
  };

  const startConversation = (person) => {
    const otherUserId = person.user_id || person.id;
    setSelectedConversation([user.id, otherUserId].sort().join("-"));
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const filteredClients = clients.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTrainers = trainers.filter(t => t.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredOtherClients = otherClients.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAllPlatformClients = allPlatformClients.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedClient = selectedConversation ? (conversations.find(c => c.id === selectedConversation) || getConversationInfo()) : null;

  const sidebarBg = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };
  const chatBg = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };

  return (
    <div className="h-[calc(100dvh-120px)] sm:h-[calc(100dvh-140px)] lg:h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar */}
      <div className={cn(
        "flex-shrink-0 flex flex-col rounded-2xl overflow-hidden transition-all",
        selectedConversation ? "hidden lg:flex lg:w-72" : "w-full lg:w-72"
      )} style={sidebarBg}>
        <div className="p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <MessageCircle className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="font-bold text-foreground">Messages</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm text-foreground placeholder:text-muted-foreground"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {clientProfile ? (
            <>
              {conversations.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">Recent</p>
                  {conversations.map((conv) => (
                    <button key={conv.id} onClick={() => setSelectedConversation(conv.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 transition-colors"
                      style={{ background: selectedConversation === conv.id ? 'rgba(34,197,94,0.08)' : 'transparent', borderLeft: selectedConversation === conv.id ? '2px solid #22c55e' : '2px solid transparent' }}>
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="text-sm font-bold text-foreground" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
                          {conv.otherUserName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-foreground truncate">{conv.otherUserName}</span>
                          {conv.unreadCount > 0 && (
                            <span className="text-xs rounded-full px-1.5 py-0.5 font-bold text-black ml-2" style={{ background: '#22c55e' }}>{conv.unreadCount}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">{conv.lastMessage}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

            </>
          ) : (
            <>
              {conversations.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">Recent</p>
                  {conversations.map((conv) => (
                    <button key={conv.id} onClick={() => setSelectedConversation(conv.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 transition-colors"
                      style={{ background: selectedConversation === conv.id ? 'rgba(212,175,55,0.08)' : 'transparent', borderLeft: selectedConversation === conv.id ? '2px solid #d4a017' : '2px solid transparent' }}>
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="text-sm font-bold text-black" style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)' }}>
                          {conv.otherUserName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-foreground truncate">{conv.otherUserName}</span>
                          {conv.unreadCount > 0 && (
                            <span className="text-xs rounded-full px-1.5 py-0.5 font-bold text-black ml-2" style={{ background: '#d4a017' }}>{conv.unreadCount}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">{conv.lastMessage}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {filteredClients.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">My Clients</p>
                  {filteredClients.map((c) => (
                    <button key={c.id} onClick={() => startConversation(c)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={c.avatar_url} />
                        <AvatarFallback className="text-sm font-bold text-foreground" style={{ background: 'hsl(var(--secondary))' }}>
                          {c.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-sm text-muted-foreground block">{c.full_name}</span>
                        <span className="text-xs text-gray-600">{c.email}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {filteredTrainers.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">Trainers</p>
                  {filteredTrainers.map((t) => (
                    <button key={t.id} onClick={() => startConversation(t)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={t.avatar_url} />
                        <AvatarFallback className="text-sm font-bold text-foreground" style={{ background: 'hsl(var(--secondary))' }}>
                          {t.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-sm text-muted-foreground block">{t.full_name}</span>
                        <span className="text-xs text-gray-600">{t.email}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {filteredAllPlatformClients.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">All Clients</p>
                  {filteredAllPlatformClients.map((c) => (
                    <button key={c.id} onClick={() => startConversation(c)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={c.avatar_url} />
                        <AvatarFallback className="text-sm font-bold text-foreground" style={{ background: 'hsl(var(--secondary))' }}>
                          {c.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-sm text-muted-foreground block">{c.full_name}</span>
                        <span className="text-xs text-gray-600">{c.email}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col rounded-2xl overflow-hidden transition-all",
        !selectedConversation ? "hidden lg:flex" : "flex"
      )} style={chatBg}>
        {selectedConversation ? (
          <>
            <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-foreground mr-1 -ml-2" onClick={() => setSelectedConversation(null)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="font-bold text-foreground" style={{ background: clientProfile ? 'linear-gradient(135deg, #22c55e, #15803d)' : 'linear-gradient(135deg, #d4a017, #f5c842)', color: clientProfile ? 'white' : 'black' }}>
                  {selectedClient?.otherUserName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{selectedClient?.otherUserName}</h3>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
              <div className="flex items-center gap-2">
                {(!clientProfile && (user?.role === 'trainer' || user?.role === 'admin')) && (
                  <Button 
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to clear this entire conversation? This action cannot be undone.")) {
                        const msgsToDelete = messages.map(m => m.id);
                        await Promise.all(msgsToDelete.map(id => base44.entities.Message.delete(id)));
                        queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation] });
                        queryClient.invalidateQueries({ queryKey: ["conversations"] });
                      }
                    }} 
                    size="sm" 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 gap-2 text-xs sm:text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear Chat</span>
                  </Button>
                )}
                {upcomingVideoSessions.length > 0 && (
                  <Button onClick={() => handleJoinCall(upcomingVideoSessions[0].video_room_id)} size="sm" className="bg-green-600 hover:bg-green-700 text-foreground font-bold gap-2 text-xs sm:text-sm">
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Join Call</span>
                  </Button>
                )}
                {!clientProfile && selectedClient && selectedClient.otherUserId && (
                  <Button onClick={() => setScheduleModalOpen(true)} size="sm" variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 gap-2 text-xs sm:text-sm">
                    <CalendarPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Schedule</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[...messages].reverse().map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={cn("flex gap-2 items-end group", isOwn && "flex-row-reverse")}>
                    <Avatar className="h-7 w-7 flex-shrink-0 mb-1">
                      <AvatarFallback className="text-xs font-bold" style={{
                        background: isOwn ? (clientProfile ? 'linear-gradient(135deg, #22c55e, #15803d)' : 'linear-gradient(135deg, #d4a017, #f5c842)') : 'hsl(var(--secondary))',
                        color: isOwn && !clientProfile ? 'black' : 'white'
                      }}>
                        {message.sender_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
                      <div className="rounded-2xl px-4 py-2.5 relative" style={isOwn ? {
                        background: clientProfile ? 'linear-gradient(135deg, rgba(34,197,94,0.8), rgba(21,128,61,0.9))' : 'linear-gradient(135deg, rgba(212,175,55,0.85), rgba(180,140,30,0.9))',
                        color: clientProfile ? 'white' : '#1a1a00'
                      } : { background: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))' }}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {isOwn && (
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this message?")) {
                                await base44.entities.Message.delete(message.id);
                                queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation] });
                              }
                            }}
                            className="absolute -left-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete message"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {message.media_urls?.length > 0 && (
                        <div className="mt-2 space-y-2 max-w-xs">
                          {(message.media_urls || []).map((url, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden">
                              {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img src={url} alt="Media" className="max-w-full h-auto rounded-xl" />
                              ) : (
                                <video src={url} controls className="max-w-full h-auto rounded-xl" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-gray-700 mt-1 px-1">
                        {safeDateParse(message.created_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              {attachedMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachedMedia.map((media, idx) => (
                    <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                      {media.type === 'image' ? <img src={media.url} alt="" className="w-full h-full object-cover" /> : <video src={media.url} className="w-full h-full object-cover" />}
                      <button onClick={() => setAttachedMedia(attachedMedia.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <X className="w-3 h-3 text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input placeholder="Type a message..." value={messageContent} onChange={(e) => setMessageContent(e.target.value)}
                  className="flex-1 text-foreground placeholder:text-muted-foreground h-10"
                  style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }} />
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleMediaUpload} disabled={isUploadingMedia} className="hidden" />
                <Button type="button" variant="ghost" size="icon" disabled={isUploadingMedia} onClick={() => fileInputRef.current?.click()}
                  className="text-muted-foreground hover:text-foreground h-10 w-10" style={{ border: '1px solid hsl(var(--border))' }}>
                  {isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                </Button>
                <Button type="submit" disabled={!messageContent.trim() && attachedMedia.length === 0} className="h-10 px-4 font-bold"
                  style={clientProfile ? { background: 'linear-gradient(135deg, #22c55e, #15803d)', color: 'white' } : { background: 'linear-gradient(135deg, #d4a017, #f5c842)', color: 'black' }}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <MessageCircle className="w-8 h-8 text-green-500/50" />
              </div>
              <h3 className="font-bold text-foreground">Select a conversation</h3>
              <p className="text-gray-600 text-sm">Choose someone to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {!clientProfile && selectedClient && selectedClient.otherUserId && (
        <ScheduleVideoModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          clientId={clients.find(c => c.user_id === selectedClient.otherUserId || c.id === selectedClient.otherUserId)?.id || selectedClient.otherUserId}
          clientName={selectedClient.otherUserName}
          trainerId={user?.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["upcomingVideoSessions"] });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
          }}
        />
      )}

      {videoCallOpen && activeRoomId && (
        <VideoCallRoom
          open={videoCallOpen}
          onOpenChange={setVideoCallOpen}
          roomId={activeRoomId}
          userName={clientProfile ? clientProfile.full_name : user?.full_name}
        />
      )}
    </div>
  );
}