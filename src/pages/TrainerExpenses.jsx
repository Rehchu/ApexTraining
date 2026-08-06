import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Edit2, MoreVertical, TrendingDown, DollarSign, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = [
  { id: "equipment", label: "Equipment", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  { id: "software", label: "Software & Apps", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  { id: "marketing", label: "Marketing", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  { id: "facility", label: "Facility Rent", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { id: "education", label: "Education & Certs", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  { id: "supplies", label: "Supplies", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  { id: "taxes", label: "Taxes & Fees", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  { id: "other", label: "Other", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
];

export default function TrainerExpenses() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({ description: "", amount: "", category: "other", date: "" });

  const { data: user } = useQuery({ queryKey: ["user"], queryFn: () => base44.auth.me() });
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.TrainerExpense.list("-created_date"),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.TrainerExpense.create({
        ...data,
        amount: parseFloat(data.amount),
        date: data.date || new Date().toISOString().split("T")[0],
        trainer_id: user.id
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setFormData({ description: "", amount: "", category: "other", date: "" });
      setIsDialogOpen(false);
      toast.success("Expense added");
    },
    onError: () => toast.error("Failed to add expense")
  });

  const updateMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.TrainerExpense.update(editingId, {
        ...data,
        amount: parseFloat(data.amount)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setFormData({ description: "", amount: "", category: "other", date: "" });
      setEditingId(null);
      setIsDialogOpen(false);
      toast.success("Expense updated");
    },
    onError: () => toast.error("Failed to update expense")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainerExpense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      toast.error("Please fill in all fields");
      return;
    }
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || "other",
      date: expense.date
    });
    setIsDialogOpen(true);
  };

  const handleExportCSV = () => {
    const rows = [["Date", "Description", "Category", "Amount"]];
    expenses.forEach(e => {
      const cat = CATEGORIES.find(c => c.id === e.category)?.label || e.category;
      rows.push([e.date || "", e.description, cat, e.amount.toFixed(2)]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "expenses.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const filteredExpenses = filterCategory === "all" ? expenses : expenses.filter(e => e.category === filterCategory);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.id).reduce((s, e) => s + (e.amount || 0), 0)
  })).filter(c => c.total > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Business Expenses</h1>
          <p className="text-muted-foreground mt-1">Track and categorize all business costs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border text-muted-foreground text-sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-red-500 to-rose-600 text-foreground border-none shadow-lg shadow-red-500/20">
                <Plus className="w-4 h-4 mr-2" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-gray-800 text-foreground">
              <DialogHeader>
                <DialogTitle className="text-xl text-foreground flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" /> {editingId ? "Edit" : "New"} Expense
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input className="bg-secondary border-gray-700 text-foreground"
                    placeholder="e.g., Dumbbells set, Monthly software"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                      <SelectTrigger className="bg-secondary border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-gray-700 text-foreground">
                        {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ($) *</Label>
                    <Input type="number" min="0" step="0.01" className="bg-secondary border-gray-700 text-foreground"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="bg-secondary border-gray-700 text-foreground"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full bg-red-600 hover:bg-red-700">
                  {editingId ? "Update Expense" : "Add Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Expenses</p>
          <p className="text-2xl font-black text-red-400">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Categories</p>
          <p className="text-2xl font-black text-indigo-400">{byCategory.length}</p>
        </div>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <Card className="bg-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byCategory.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: cat.bg }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                    <span className="text-sm font-medium text-foreground">{cat.label}</span>
                  </div>
                  <span className="font-bold text-foreground">${cat.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter & List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48 bg-secondary border-gray-700 text-foreground text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-gray-700 text-foreground">
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-gray-800 bg-secondary">
            <TrendingDown className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">No expenses yet</h3>
            <p className="text-muted-foreground mt-1">Add your first expense to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map(expense => {
              const cat = CATEGORIES.find(c => c.id === expense.category);
              return (
                <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-secondary hover:bg-card transition-colors group">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cat?.bg }}>
                      <DollarSign className="w-5 h-5" style={{ color: cat?.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{cat?.label} • {expense.date ? format(new Date(expense.date), "MMM d") : format(new Date(expense.created_date), "MMM d")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-lg font-bold text-foreground">${expense.amount.toFixed(2)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent border-0 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-gray-800 text-foreground">
                        <DropdownMenuItem className="focus:bg-secondary cursor-pointer" onClick={() => handleEdit(expense)}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-red-500/20 text-red-400 cursor-pointer"
                          onClick={() => { if (window.confirm("Delete this expense?")) deleteMutation.mutate(expense.id); }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}