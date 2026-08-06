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
  Zap,
  Award,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProgressCharts from "@/components/progress/ProgressCharts";
import { cn } from "@/lib/utils";
import { useUnitSystem } from "@/components/hooks/useUnitSystem";

export default function ClientProgress() {
  const { system, convertWeightDisplay, parseWeight, convertHeightDisplay, parseHeight, weightUnit, heightUnit } = useUnitSystem();
  const [user, setUser] = useState(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [formData, setFormData] = useState({
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
      thigh_right: "",
    },
    performance_metrics: {
      bench_press_kg: "",
      squat_kg: "",
      deadlift_kg: "",
      max_pullups: "",
      max_pushups: "",
      plank_seconds: "",
    },
    client_feedback: "",
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: progressLogs = [] } = useQuery({
    queryKey: ["myProgressLogs"],
    queryFn: async () => {
      if (!user?.id) return [];
      const logs = await base44.entities.ProgressLog.filter({ client_id: user.id }, "-date");
      return logs;
    },
    enabled: !!user?.id,
  });

  const createLogMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.ProgressLog.create({
        ...data,
        client_id: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProgressLogs"] });
      setShowLogForm(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
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
        thigh_right: "",
      },
      performance_metrics: {
        bench_press_kg: "",
        squat_kg: "",
        deadlift_kg: "",
        max_pullups: "",
        max_pushups: "",
        plank_seconds: "",
      },
      client_feedback: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanData = {
      ...formData,
      weight_kg: formData.weight_kg ? parseWeight(formData.weight_kg) : null,
      body_fat_percentage: formData.body_fat_percentage
        ? parseFloat(formData.body_fat_percentage)
        : null,
      measurements: Object.fromEntries(
        Object.entries(formData.measurements)
          .filter(([_, v]) => v !== "")
          .map(([k, v]) => [k, parseHeight(v)])
      ),
      performance_metrics: Object.fromEntries(
        Object.entries(formData.performance_metrics)
          .filter(([_, v]) => v !== "")
          .map(([k, v]) => [k, k.includes('seconds') || k.includes('max') ? parseFloat(v) : parseWeight(v)])
      ),
    };
    await createLogMutation.mutateAsync(cleanData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value },
    }));
  };

  const handlePerformanceChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      performance_metrics: { ...prev.performance_metrics, [field]: value },
    }));
  };

  const latestLog = progressLogs[0];
  const previousLog = progressLogs[1];
  const weightChange =
    latestLog && previousLog
      ? (convertWeightDisplay(latestLog.weight_kg) - convertWeightDisplay(previousLog.weight_kg)).toFixed(1)
      : null;
  const bodyFatChange =
    latestLog && previousLog
      ? (latestLog.body_fat_percentage - previousLog.body_fat_percentage).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Progress</h1>
          <p className="text-muted-foreground mt-1">Track your fitness journey</p>
        </div>
        <Button
          onClick={() => setShowLogForm(true)}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Progress
        </Button>
      </div>

      {/* Stats Cards */}
      {latestLog && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {latestLog.weight_kg && (
            <Card className="glass-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Weight</CardTitle>
                <Scale className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{convertWeightDisplay(latestLog.weight_kg)} {weightUnit}</div>
                {weightChange && (
                  <p
                    className={cn(
                      "text-xs mt-1",
                      parseFloat(weightChange) < 0 ? "text-emerald-400" : "text-amber-400"
                    )}
                  >
                    {parseFloat(weightChange) > 0 ? "+" : ""}{weightChange} {weightUnit}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {latestLog.body_fat_percentage && (
            <Card className="glass-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Body Fat</CardTitle>
                <TrendingUp className="w-4 h-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {latestLog.body_fat_percentage}%
                </div>
                {bodyFatChange && (
                  <p
                    className={cn(
                      "text-xs mt-1",
                      parseFloat(bodyFatChange) < 0 ? "text-emerald-400" : "text-amber-400"
                    )}
                  >
                    {parseFloat(bodyFatChange) > 0 ? "+" : ""}{bodyFatChange}%
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {latestLog.measurements?.waist && (
            <Card className="glass-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Waist</CardTitle>
                <Ruler className="w-4 h-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {convertHeightDisplay(latestLog.measurements.waist)} {heightUnit}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Logs</CardTitle>
              <Award className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{progressLogs.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {progressLogs.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Progress Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressCharts logs={progressLogs} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Logs */}
      {progressLogs.length > 0 ? (
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {progressLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {format(new Date(log.date), "MMMM d, yyyy")}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      {log.weight_kg && (
                        <span className="flex items-center gap-1">
                          <Scale className="w-3 h-3" />
                          {convertWeightDisplay(log.weight_kg)} {weightUnit}
                        </span>
                      )}
                      {log.body_fat_percentage && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {log.body_fat_percentage}%
                        </span>
                      )}
                      {log.performance_metrics?.bench_press_kg && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Bench: {convertWeightDisplay(log.performance_metrics.bench_press_kg)} {weightUnit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {log.client_feedback && (
                  <p className="mt-2 text-sm text-muted-foreground italic">
                    "{log.client_feedback}"
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              No progress logs yet
            </h3>
            <p className="text-muted-foreground mt-2">
              Start tracking your progress to see your improvements
            </p>
            <Button
              onClick={() => setShowLogForm(true)}
              className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              Log Your First Entry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Log Form Dialog */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-foreground">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-foreground" />
              </div>
              Log Your Progress
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-muted-foreground">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {/* Body Metrics */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Body Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight_kg">Weight ({weightUnit})</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.1"
                    placeholder={system === 'imperial' ? "150" : "70"}
                    value={formData.weight_kg}
                    onChange={(e) =>
                      handleChange("weight_kg", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body_fat_percentage">Body Fat %</Label>
                  <Input
                    id="body_fat_percentage"
                    type="number"
                    step="0.1"
                    placeholder="20"
                    value={formData.body_fat_percentage}
                    onChange={(e) =>
                      handleChange("body_fat_percentage", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Body Measurements */}
            <Collapsible open={measurementsOpen} onOpenChange={setMeasurementsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> Body Measurements ({heightUnit})
                  </span>
                  <ChevronDown
                    className={cn("w-4 h-4 transition-transform", measurementsOpen && "rotate-180")}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    "chest",
                    "waist",
                    "hips",
                    "biceps_left",
                    "biceps_right",
                    "thigh_left",
                    "thigh_right",
                  ].map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs capitalize">
                        {field.replace(/_/g, " ")}
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={formData.measurements[field] || ""}
                        onChange={(e) =>
                          handleMeasurementChange(field, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Performance Metrics */}
            <Collapsible open={performanceOpen} onOpenChange={setPerformanceOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Performance Metrics
                  </span>
                  <ChevronDown
                    className={cn("w-4 h-4 transition-transform", performanceOpen && "rotate-180")}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="bench_press_kg" className="text-xs">
                      Bench Press ({weightUnit})
                    </Label>
                    <Input
                      id="bench_press_kg"
                      type="number"
                      step="0.5"
                      placeholder={system === 'imperial' ? "135" : "60"}
                      value={formData.performance_metrics.bench_press_kg}
                      onChange={(e) =>
                        handlePerformanceChange("bench_press_kg", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="squat_kg" className="text-xs">
                      Squat ({weightUnit})
                    </Label>
                    <Input
                      id="squat_kg"
                      type="number"
                      step="0.5"
                      placeholder={system === 'imperial' ? "185" : "80"}
                      value={formData.performance_metrics.squat_kg}
                      onChange={(e) =>
                        handlePerformanceChange("squat_kg", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadlift_kg" className="text-xs">
                      Deadlift ({weightUnit})
                    </Label>
                    <Input
                      id="deadlift_kg"
                      type="number"
                      step="0.5"
                      placeholder={system === 'imperial' ? "225" : "100"}
                      value={formData.performance_metrics.deadlift_kg}
                      onChange={(e) =>
                        handlePerformanceChange("deadlift_kg", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_pullups" className="text-xs">
                      Max Pull-ups
                    </Label>
                    <Input
                      id="max_pullups"
                      type="number"
                      placeholder="10"
                      value={formData.performance_metrics.max_pullups}
                      onChange={(e) =>
                        handlePerformanceChange("max_pullups", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_pushups" className="text-xs">
                      Max Push-ups
                    </Label>
                    <Input
                      id="max_pushups"
                      type="number"
                      placeholder="30"
                      value={formData.performance_metrics.max_pushups}
                      onChange={(e) =>
                        handlePerformanceChange("max_pushups", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plank_seconds" className="text-xs">
                      Plank (seconds)
                    </Label>
                    <Input
                      id="plank_seconds"
                      type="number"
                      placeholder="60"
                      value={formData.performance_metrics.plank_seconds}
                      onChange={(e) =>
                        handlePerformanceChange("plank_seconds", e.target.value)
                      }
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Feedback */}
            <div className="space-y-2">
              <Label htmlFor="client_feedback">How are you feeling?</Label>
              <Textarea
                id="client_feedback"
                placeholder="Share your thoughts, concerns, or observations..."
                className="min-h-[80px]"
                value={formData.client_feedback}
                onChange={(e) => handleChange("client_feedback", e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowLogForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 gap-2"
                disabled={createLogMutation.isPending}
              >
                {createLogMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <span>✓ Save Progress</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}