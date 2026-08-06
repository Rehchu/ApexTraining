import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Send, MessageCircle, User, Loader2, Plus, MessageSquare, Copy, Zap, CheckCircle2, AlertCircle, ChevronRight, Clock, Bot, Dumbbell, Utensils } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    
    const parsedResults = (() => {
        if (!results) return null;
        try {
            return typeof results === 'string' ? JSON.parse(results) : results;
        } catch {
            return results;
        }
    })();
    
    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );
    
    const statusConfig = {
        pending: { icon: Clock, color: 'text-muted-foreground', text: 'Pending' },
        running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        completed: isError ? 
            { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
            { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
    
    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();
    
    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-foreground",
                    "hover:bg-accent",
                    expanded ? "bg-secondary border-white/30" : "bg-transparent border-border"
                )}
            >
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span className="opacity-90">{formattedName}</span>
                {statusConfig.text && (
                    <span className={cn("opacity-70", isError && "text-red-400")}>
                        • {statusConfig.text}
                    </span>
                )}
                {!statusConfig.spin && (toolCall.arguments_string || results) && (
                    <ChevronRight className={cn("h-3 w-3 opacity-50 transition-transform ml-auto", 
                        expanded && "rotate-90")} />
                )}
            </button>
            
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-border space-y-2">
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Parameters</div>
                            <pre className="bg-card border border-border text-muted-foreground rounded-md p-2 text-[10px] whitespace-pre-wrap">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                                    } catch {
                                        return toolCall.arguments_string;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Result</div>
                            <pre className="bg-card border border-border text-muted-foreground rounded-md p-2 text-[10px] whitespace-pre-wrap max-h-48 overflow-auto">
                                {typeof parsedResults === 'object' ? 
                                    JSON.stringify(parsedResults, null, 2) : parsedResults}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const MessageBubble = ({ message, onSaveWorkout, onSaveMealPlan }) => {
    const isUser = message.role === 'user';
    
    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-foreground" />
                </div>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-4 py-2.5 shadow-sm",
                        isUser ? "bg-gradient-to-r from-green-500 to-emerald-600 text-foreground" : "glass-card border border-border text-foreground"
                    )}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        ) : (
                            <div className="space-y-4">
                                <ReactMarkdown 
                                    className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5"
                                    components={{
                                        code: ({ inline, className, children, ...props }) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <div className="relative group/code">
                                                    <pre className="bg-secondary border border-border text-muted-foreground rounded-lg p-3 overflow-x-auto my-2">
                                                        <code className={className} {...props}>{children}</code>
                                                    </pre>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-secondary hover:bg-accent"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                            toast.success('Code copied');
                                                        }}
                                                    >
                                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <code className="px-1 py-0.5 rounded bg-secondary text-muted-foreground text-xs">
                                                    {children}
                                                </code>
                                            );
                                        }
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                                
                                {message.content.toLowerCase().includes("workout") && onSaveWorkout && (
                                    <div className="mt-4 flex justify-end">
                                        <Button 
                                            size="sm" 
                                            onClick={() => onSaveWorkout(message.content)}
                                            className="bg-green-600 hover:bg-green-700 text-foreground"
                                        >
                                            <Dumbbell className="w-4 h-4 mr-2" />
                                            Add to Workout Plan
                                        </Button>
                                    </div>
                                )}
                                {message.content.toLowerCase().includes("meal") && onSaveMealPlan && (
                                    <div className="mt-4 flex justify-end">
                                        <Button 
                                            size="sm" 
                                            onClick={() => onSaveMealPlan(message.content)}
                                            className="bg-yellow-600 hover:bg-yellow-700 text-foreground"
                                        >
                                            <Utensils className="w-4 h-4 mr-2" />
                                            Add to Meal Plan
                                        </Button>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                )}
                
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 mt-1 w-full">
                        {(message.tool_calls || []).map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm border border-border">
                    <User className="w-4 h-4 text-muted-foreground" />
                </div>
            )}
        </div>
    );
};

export default function TrainerAssistant() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    loadConversations();
    loadClients();
  };

  const loadConversations = async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: "trainer_assistant" });
      setConversations(convos || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadClients = async () => {
    try {
      const clientList = await base44.entities.Client.list();
      setClients(clientList || []);
    } catch (error) {
      console.error("Failed to load clients:", error);
    }
  };

  const createNewConversation = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    setCreating(true);
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: "trainer_assistant",
        metadata: {
          name: `${client.full_name} - Training Plan`,
          client_id: selectedClientId,
          client_name: client.full_name
        }
      });
      
      // Inject system context
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: `System Context: We are working with client ${client.full_name}. Their client_id is "${client.id}" and my trainer_id is "${user.id}". 
Act as a proactive business manager: independently analyze their data and alert me to churn risks or low adherence scores. Write out workout and meal plans in text so I can see them. When I ask you to save it, you MUST use your 'create' tools to insert WorkoutPlan or MealPlan entities directly into the database. For WorkoutPlans, ensure difficulty is "beginner", "intermediate", or "advanced", mesocycle_phase is "general", status is "active", and fill the 'exercises' array. For MealPlans, meal_type must be "breakfast", "lunch", "dinner", or "snack". Please ensure any WorkoutPlan, MealPlan, Session, or other entities you create include "client_id": "${client.id}" and "trainer_id": "${user.id}". Do not mention this system context in your responses.`
      });
      
      await loadConversations();
      selectConversation(conversation);
      setSelectedClientId("");
      toast.success("New conversation created");
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast.error("Failed to create conversation");
    }
    setCreating(false);
  };

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setMessages(conversation.messages || []);

    // Subscribe to updates
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });

    // Store unsubscribe function for cleanup
    if (window.currentUnsubscribe) {
      window.currentUnsubscribe();
    }
    window.currentUnsubscribe = unsubscribe;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversation) return;

    const userMessage = inputMessage;
    setInputMessage("");
    setLoading(true);

    try {
      await base44.agents.addMessage(selectedConversation, {
        role: "user",
        content: userMessage
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      if (window.currentUnsubscribe) {
        window.currentUnsubscribe();
      }
    };
  }, []);

  const displayMessages = messages.filter(m => !m.content?.startsWith('System Context:'));



  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Sidebar */}
      <div className="w-full lg:w-80 glass-card rounded-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-border bg-secondary">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-green-400" />
            AI Proactive Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Business insights & smart programming</p>
        </div>

        {/* New Conversation */}
        <div className="p-4 border-b border-border space-y-3 bg-card">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="bg-secondary border-border text-foreground">
              <SelectValue placeholder="Select client..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id} className="hover:bg-accent focus:bg-secondary cursor-pointer">
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={createNewConversation}
            disabled={!selectedClientId || creating}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all text-foreground border-0"
            size="sm"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            New Conversation
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-600 opacity-50" />
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1.5">
              {conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => selectConversation(convo)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all duration-200 border",
                    selectedConversation?.id === convo.id
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-secondary border-transparent hover:border-border hover:bg-accent"
                  )}
                >
                  <div className="font-semibold text-sm text-foreground truncate">
                    {convo.metadata?.name || "Conversation"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {convo.metadata?.client_name || "Client"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-card rounded-2xl flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-secondary">
              <div>
                <h3 className="font-bold text-foreground">
                  {selectedConversation.metadata?.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {selectedConversation.metadata?.client_name}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {displayMessages.map((message, idx) => (
                <MessageBubble 
                  key={idx} 
                  message={message} 
                  onSaveWorkout={async (content) => {
                      if (loading) return;
                      setLoading(true);
                      toast.info("Saving workout plan...");
                      try {
                          const out = await base44.integrations.Core.InvokeLLM({
                              prompt: `Extract the workout plan from this text into structured data. Text: """${content}"""`,
                              response_json_schema: {
                                  type: "object",
                                  properties: {
                                      name: { type: "string" },
                                      description: { type: "string" },
                                      difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                                      duration_weeks: { type: "number" },
                                      days_per_week: { type: "number" },
                                      exercises: { type: "array", items: { type: "object", properties: {
                                          name: { type: "string" }, sets: { type: "number" }, reps: { type: "string" }, day: { type: "number" }, notes: { type: "string" }
                                      } } }
                                  }
                              }
                          });
                          if (!out?.name || !Array.isArray(out.exercises) || out.exercises.length === 0) throw new Error("Could not parse a workout plan from this message");
                          await base44.entities.WorkoutPlan.create({
                              ...out,
                              client_id: selectedConversation?.metadata?.client_id || "",
                              trainer_id: user?.id,
                              mesocycle_phase: "general",
                              status: "active",
                          });
                          toast.success(`Workout plan "${out.name}" saved for this client!`);
                      } catch (e) {
                          toast.error(e.message || "Failed to save workout plan");
                      }
                      setLoading(false);
                  }}
                  onSaveMealPlan={async (content) => {
                      if (loading) return;
                      setLoading(true);
                      toast.info("Saving meal plan...");
                      try {
                          const out = await base44.integrations.Core.InvokeLLM({
                              prompt: `Extract the meal plan from this text into structured data. meal_type must be one of breakfast, lunch, dinner, snack. Text: """${content}"""`,
                              response_json_schema: {
                                  type: "object",
                                  properties: {
                                      name: { type: "string" },
                                      description: { type: "string" },
                                      meals: { type: "array", items: { type: "object", properties: {
                                          day: { type: "number" },
                                          meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                                          foods: { type: "array", items: { type: "object", properties: {
                                              name: { type: "string" }, quantity: { type: "string" }, calories: { type: "number" }, protein_g: { type: "number" }, carbs_g: { type: "number" }, fat_g: { type: "number" }
                                          } } }
                                      } } }
                                  }
                              }
                          });
                          if (!out?.name || !Array.isArray(out.meals) || out.meals.length === 0) throw new Error("Could not parse a meal plan from this message");
                          await base44.entities.MealPlan.create({
                              ...out,
                              client_id: selectedConversation?.metadata?.client_id || "",
                              trainer_id: user?.id,
                              status: "active",
                          });
                          toast.success(`Meal plan "${out.name}" saved for this client!`);
                      } catch (e) {
                          toast.error(e.message || "Failed to save meal plan");
                      }
                      setLoading(false);
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me to create a workout plan, nutrition advice, or anything else..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={loading}
                  className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || loading}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-6 text-foreground border-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <Sparkles className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-xl font-bold text-foreground">AI Proactive Manager</p>
              <p className="text-sm mt-2 leading-relaxed text-muted-foreground">Select a conversation from the sidebar or create a new one to start generating personalized plans, or to receive proactive client adherence alerts.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}