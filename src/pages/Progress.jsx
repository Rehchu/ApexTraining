import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Plus, 
  TrendingUp,
  Scale,
  Ruler,
  Camera,
  User,
  ChevronDown
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import ProgressCharts from "@/components/progress/ProgressCharts";

export default function Progress() {
  const [user, setUser] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    weight_kg: "",
    body_fat_percentage: "",
    measurements: {
      chest: "",
      waist: "",
      hips: "",
      biceps_left: "",
      biceps_right: "",
      thigh_left: "",
      thigh_right: ""
    },
    performance_metrics: {
      bench_press_kg: "",
      squat_kg: "",
      deadlift_kg: "",
      max_pullups: "",
      max_pushups: "",
      plank_seconds: ""
    },
    biometrics: {
      hrv_ms: "",
      fasting_glucose_mgdl: "",
      sleep_quality_score: "",
      cns_readiness: ""
    },
    notes: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ["progressLogs"],
    queryFn: () => base44.entities.ProgressLog.list("-date"),
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.ProgressLog.create({ ...data, trainer_id: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progressLogs"] });
      setShowLogForm(false);
      setFormData({
        client_id: selectedClientId,
        date: format(new Date(), "yyyy-MM-dd"),
        weight_kg: "",
        body_fat_percentage: "",
        measurements: {},
        performance_metrics: {},
        biometrics: {},
        notes: ""
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanData = {
      ...formData,
      weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
      body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : null,
      measurements: Object.fromEntries(
        Object.entries(formData.measurements || {}).filter(([_, v]) => v !== "").map(([k, v]) => [k, parseFloat(v)])
      ),
      performance_metrics: Object.fromEntries(
        Object.entries(formData.performance_metrics || {}).filter(([_, v]) => v !== "").map(([k, v]) => [k, parseFloat(v)])
      ),
      biometrics: Object.fromEntries(
        Object.entries(formData.biometrics || {}).filter(([_, v]) => v !== "").map(([k, v]) => [k, parseFloat(v)])
      )
    };
    await createLogMutation.mutateAsync(cleanData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value }
    }));
  };

  const handleBiometricChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      biometrics: { ...(prev.biometrics || {}), [field]: value }
    }));
  };

  const clientLogs = selectedClientId 
    ? progressLogs.filter(log => log.client_id === selectedClientId).sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  const chartData = clientLogs.map(log => ({
    date: format(new Date(log.date), "MMM d"),
    weight: log.weight_kg,
    bodyFat: log.body_fat_percentage
  }));

  const getClientById = (id) => clients.find(c => c.id === id);
  const selectedClient = getClientById(selectedClientId);

  const latestLog = clientLogs[clientLogs.length - 1];
  const previousLog = clientLogs[clientLogs.length - 2];

  const weightChange = latestLog && previousLog 
    ? (latestLog.weight_kg - previousLog.weight_kg).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Progress Tracking</h1>
          <p className="text-muted-foreground mt-1">Monitor client measurements and progress</p>
        </div>
        <Button 
          onClick={() => {
            setFormData(prev => ({ ...prev, client_id: selectedClientId }));
            setShowLogForm(true);
          }}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25"
          disabled={!selectedClientId}
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Progress
        </Button>
      </div>

      {/* Client Selector */}
      <div className="glass-card rounded-2xl p-6">
        <Label className="text-base font-medium text-foreground">Select Client</Label>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="mt-2 max-w-md">
            <SelectValue placeholder="Choose a client to view progress" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-foreground text-xs">
                    {client.full_name?.[0]}
                  </div>
                  {client.full_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClientId && (
        <>
          <Tabs defaultValue="photos" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="photos">Progress Photos</TabsTrigger>
              <TabsTrigger value="stats">Stats & History</TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="space-y-4">
              {clientLogs.filter(log => log.photo_urls?.length > 0).length > 0 ? (
                <div className="grid gap-6">
                  {clientLogs.filter(log => log.photo_urls?.length > 0).reverse().map((log) => (
                    <div key={log.id} className="glass-card rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-border flex items-center gap-2">
                        <Camera className="h-5 w-5 text-emerald-400" />
                        <h3 className="font-semibold text-foreground">
                          {format(new Date(log.date), 'MMMM yyyy')}
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                          {(log.photo_urls || []).map((url, idx) => (
                            <div key={idx} className="space-y-2">
                              <p className="text-sm font-medium text-slate-600">
                                {idx === 0 ? 'Before' : 'After'}
                              </p>
                              <img 
                                src={url} 
                                alt={`Progress photo ${idx + 1}`}
                                className="w-full h-80 object-cover rounded-xl border border-slate-200 shadow-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <Camera className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No progress photos yet</h3>
                  <p className="text-muted-foreground mt-2">Client hasn't uploaded any monthly photos</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Scale className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Weight</p>
                  <p className="text-2xl font-bold text-foreground">
                    {latestLog?.weight_kg ? `${latestLog.weight_kg} kg` : "—"}
                  </p>
                  {weightChange && (
                    <p className={cn(
                      "text-xs font-medium",
                      parseFloat(weightChange) < 0 ? "text-emerald-400" : "text-amber-400"
                    )}>
                      {parseFloat(weightChange) > 0 ? "+" : ""}{weightChange} kg
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Body Fat %</p>
                  <p className="text-2xl font-bold text-foreground">
                    {latestLog?.body_fat_percentage ? `${latestLog.body_fat_percentage}%` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Ruler className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold text-foreground">{clientLogs.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Charts */}
          {clientLogs.length > 0 && (
            <ProgressCharts logs={clientLogs} />
          )}

          {/* Progress Log History */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Progress History</h3>
            </div>
            <div className="divide-y divide-white/5">
              {clientLogs.length > 0 ? (
                [...clientLogs].reverse().map((log) => (
                  <div key={log.id} className="p-4 hover:bg-accent transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">
                        {format(new Date(log.date), "MMMM d, yyyy")}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        {log.weight_kg && (
                          <span className="text-muted-foreground">
                            <Scale className="w-4 h-4 inline mr-1" />
                            {log.weight_kg} kg
                          </span>
                        )}
                        {log.body_fat_percentage && (
                          <span className="text-muted-foreground">
                            <TrendingUp className="w-4 h-4 inline mr-1" />
                            {log.body_fat_percentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    {log.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">{log.notes}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-gray-600" />
                  <p className="mt-3 text-muted-foreground">No progress logs yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, client_id: selectedClientId }));
                      setShowLogForm(true);
                    }}
                  >
                    Log First Entry
                  </Button>
                </div>
              )}
            </div>
          </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!selectedClientId && (
        <div className="text-center py-16 glass-card rounded-2xl">
          <User className="w-16 h-16 mx-auto text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Select a Client</h3>
          <p className="mt-2 text-muted-foreground">Choose a client above to view and log their progress</p>
        </div>
      )}

      {/* Log Form Dialog */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-foreground" />
              </div>
              Log Progress
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={formData.client_id} onValueChange={(v) => handleChange("client_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="70.5"
                  value={formData.weight_kg}
                  onChange={(e) => handleChange("weight_kg", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyfat">Body Fat %</Label>
                <Input
                  id="bodyfat"
                  type="number"
                  step="0.1"
                  placeholder="15.0"
                  value={formData.body_fat_percentage}
                  onChange={(e) => handleChange("body_fat_percentage", e.target.value)}
                />
              </div>
            </div>

            <Collapsible open={measurementsOpen} onOpenChange={setMeasurementsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> Body Measurements
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", measurementsOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-2 gap-3">
                  {["chest", "waist", "hips", "biceps_left", "biceps_right", "thigh_left", "thigh_right"].map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs capitalize">{field.replace("_", " ")} (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.measurements[field] || ""}
                        onChange={(e) => handleMeasurementChange(field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hrv">HRV (ms)</Label>
                <Input
                  id="hrv"
                  type="number"
                  placeholder="e.g. 65"
                  value={formData.biometrics?.hrv_ms || ""}
                  onChange={(e) => handleBiometricChange("hrv_ms", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sleep">Sleep Score (1-100)</Label>
                <Input
                  id="sleep"
                  type="number"
                  placeholder="e.g. 85"
                  value={formData.biometrics?.sleep_quality_score || ""}
                  onChange={(e) => handleBiometricChange("sleep_quality_score", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cns">CNS Readiness</Label>
                <Input
                  id="cns"
                  type="number"
                  placeholder="e.g. 90"
                  value={formData.biometrics?.cns_readiness || ""}
                  onChange={(e) => handleBiometricChange("cns_readiness", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="glucose">Fasting Glucose</Label>
                <Input
                  id="glucose"
                  type="number"
                  placeholder="e.g. 80"
                  value={formData.biometrics?.fasting_glucose_mgdl || ""}
                  onChange={(e) => handleBiometricChange("fasting_glucose_mgdl", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any observations or notes..."
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowLogForm(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                disabled={createLogMutation.isPending}
              >
                Save Progress
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}