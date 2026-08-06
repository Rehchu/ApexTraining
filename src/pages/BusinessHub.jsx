import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckCircle2, Circle, Pencil, Trash2, DollarSign, Target, ArrowUpRight, ArrowDownRight, Briefcase, Package as PackageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket } from "lucide-react";

function TicketsTab({ user, queryClient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', expire_days: 30, occasions: 0 });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['ticketTemplates', user?.id],
    queryFn: () => base44.entities.TicketTemplate.filter({ trainer_id: user?.id }),
    enabled: !!user?.id
  });

  React.useEffect(() => {
    if (editingTicket) {
      setFormData({
        name: editingTicket.name,
        description: editingTicket.description || '',
        price: editingTicket.price,
        expire_days: editingTicket.expire_days,
        occasions: editingTicket.occasions || 0
      });
    } else {
      setFormData({ name: '', description: '', price: '', expire_days: 30, occasions: 0 });
    }
  }, [editingTicket, isOpen]);

  const saveTicket = async () => {
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        expire_days: parseInt(formData.expire_days),
        occasions: parseInt(formData.occasions) || 0,
        trainer_id: user.id
      };
      if (editingTicket) {
        await base44.entities.TicketTemplate.update(editingTicket.id, data);
        toast.success("Ticket updated");
      } else {
        await base44.entities.TicketTemplate.create(data);
        toast.success("Ticket created");
      }
      queryClient.invalidateQueries(['ticketTemplates']);
      setIsOpen(false);
    } catch (e) {
      toast.error("Failed to save ticket");
    }
  };

  const deleteTicket = async (id) => {
    if (confirm("Delete this ticket type?")) {
      await base44.entities.TicketTemplate.delete(id);
      queryClient.invalidateQueries(['ticketTemplates']);
      toast.success("Ticket deleted");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Punch Cards & Day Passes</h2>
        <Button onClick={() => { setEditingTicket(null); setIsOpen(true); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New Pass
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map(ticket => (
          <Card key={ticket.id} className="glass-card border-indigo-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground flex justify-between items-start">
                {ticket.name}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingTicket(ticket); setIsOpen(true); }}>
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => deleteTicket(ticket.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardTitle>
              <div className="text-2xl font-bold text-indigo-400">${ticket.price}</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{ticket.description}</p>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between bg-secondary p-2 rounded">
                  <span>Occasions:</span>
                  <span className="font-semibold text-foreground">{ticket.occasions ? ticket.occasions : 'Unlimited'}</span>
                </div>
                <div className="flex justify-between bg-secondary p-2 rounded">
                  <span>Expires In:</span>
                  <span className="font-semibold text-foreground">{ticket.expire_days} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {tickets.length === 0 && !isLoading && (
          <div className="col-span-full text-center p-8 text-muted-foreground border border-dashed border-border rounded-xl">
            No passes created yet. Add one to let clients buy single visits or punch cards!
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle>{editingTicket ? 'Edit Pass' : 'New Pass'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-frosted" placeholder="E.g., 10-Class Punch Card" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-frosted h-20" placeholder="Valid for any group class..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="input-frosted" />
              </div>
              <div className="space-y-2">
                <Label>Occasions</Label>
                <Input type="number" value={formData.occasions} onChange={e => setFormData({ ...formData, occasions: e.target.value })} className="input-frosted" placeholder="0 = Unlimited" />
              </div>
              <div className="space-y-2">
                <Label>Expiry (Days)</Label>
                <Input type="number" value={formData.expire_days} onChange={e => setFormData({ ...formData, expire_days: e.target.value })} className="input-frosted" placeholder="30" />
              </div>
            </div>
            <Button onClick={saveTicket} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700" disabled={!formData.name || !formData.price || !formData.expire_days}>Save Pass</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BusinessHub() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("tickets");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['trainerTasks', user?.id],
    queryFn: () => base44.entities.TrainerTask.filter({ trainer_id: user.id }, '-created_date'),
    enabled: !!user
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['trainerExpenses', user?.id],
    queryFn: () => base44.entities.TrainerExpense.filter({ trainer_id: user.id }, '-date'),
    enabled: !!user
  });

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const marketingExpenses = expenses.filter(e => e.category === 'marketing' || e.category === 'advertising').reduce((sum, exp) => sum + exp.amount, 0);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Business Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your business tasks and expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Pending Tasks</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{tasks.filter(t => t.status !== 'done').length}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Target className="text-blue-400 h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Expenses</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">${totalExpenses.toFixed(2)}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <ArrowDownRight className="text-red-400 h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Marketing Spend</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">${marketingExpenses.toFixed(2)}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Briefcase className="text-purple-400 h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 font-medium transition-all relative whitespace-nowrap ${activeTab === 'tickets' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Day Passes & Punch Cards
          {activeTab === 'tickets' && (
            <motion.div layoutId="tab-indicator" className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#d4a017]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 font-medium transition-all relative whitespace-nowrap ${activeTab === 'tasks' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Tasks
          {activeTab === 'tasks' && (
            <motion.div layoutId="tab-indicator" className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#d4a017]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 font-medium transition-all relative whitespace-nowrap ${activeTab === 'expenses' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Expenses
          {activeTab === 'expenses' && (
            <motion.div layoutId="tab-indicator" className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#d4a017]" />
          )}
        </button>
      </div>

      {activeTab === 'tickets' && (
        <TicketsTab user={user} queryClient={queryClient} />
      )}

      {activeTab === 'tasks' && (
        <TasksTab
          user={user}
          tasks={tasks}
          queryClient={queryClient}
          isOpen={isTaskModalOpen}
          setIsOpen={setIsTaskModalOpen}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpensesTab
          user={user}
          expenses={expenses}
          queryClient={queryClient}
          isOpen={isExpenseModalOpen}
          setIsOpen={setIsExpenseModalOpen}
          editingExpense={editingExpense}
          setEditingExpense={setEditingExpense}
        />
      )}
    </div>
  );
}

function TasksTab({ user, tasks, queryClient, isOpen, setIsOpen, editingTask, setEditingTask }) {
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium', due_date: '' });

  React.useEffect(() => {
    if (editingTask) setFormData({ title: editingTask.title, description: editingTask.description || '', priority: editingTask.priority || 'medium', due_date: editingTask.due_date || '' });
    else setFormData({ title: '', description: '', priority: 'medium', due_date: '' });
  }, [editingTask, isOpen]);

  const saveTask = async () => {
    try {
      if (editingTask) {
        await base44.entities.TrainerTask.update(editingTask.id, formData);
        toast.success("Task updated");
      } else {
        await base44.entities.TrainerTask.create({ ...formData, trainer_id: user.id, status: 'todo' });
        toast.success("Task created");
      }
      queryClient.invalidateQueries(['trainerTasks']);
      setIsOpen(false);
    } catch (e) {
      toast.error("Failed to save task");
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await base44.entities.TrainerTask.update(task.id, { status: newStatus });
      queryClient.invalidateQueries(['trainerTasks']);
    } catch (e) {}
  };

  const deleteTask = async (id) => {
    if (confirm("Delete this task?")) {
      await base44.entities.TrainerTask.delete(id);
      queryClient.invalidateQueries(['trainerTasks']);
      toast.success("Task deleted");
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">To-Do List</h2>
        <Button onClick={() => { setEditingTask(null); setIsOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      <div className="space-y-2">
        {sortedTasks.map(task => (
          <div key={task.id} className={`flex items-center justify-between p-4 rounded-xl border border-border bg-secondary transition-all hover:bg-accent ${task.status === 'done' ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleTaskStatus(task)} className="text-muted-foreground hover:text-green-500">
                {task.status === 'done' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
              </button>
              <div>
                <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</h4>
                {(task.description || task.due_date) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.due_date && <span className="mr-2 text-yellow-500/80 text-xs bg-yellow-500/10 px-2 py-0.5 rounded">Due: {task.due_date}</span>}
                    {task.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setEditingTask(task); setIsOpen(true); }}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        ))}
        {sortedTasks.length === 0 && (
          <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-xl">
            No tasks yet. Create one to get started!
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input-frosted" placeholder="E.g., Follow up with John" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-frosted min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger className="input-frosted"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="input-frosted" />
              </div>
            </div>
            <Button onClick={saveTask} className="w-full mt-2" disabled={!formData.title}>Save Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpensesTab({ user, expenses, queryClient, isOpen, setIsOpen, editingExpense, setEditingExpense }) {
  const [formData, setFormData] = useState({ title: '', vendor: '', category: 'other', amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '', items: [] });

  React.useEffect(() => {
    if (editingExpense) setFormData({ 
      title: editingExpense.title, 
      vendor: editingExpense.vendor || '',
      category: editingExpense.category || 'other', 
      amount: editingExpense.amount, 
      date: editingExpense.date, 
      notes: editingExpense.notes || '',
      items: editingExpense.items || []
    });
    else setFormData({ title: '', vendor: '', category: 'other', amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '', items: [] });
  }, [editingExpense, isOpen]);

  const addItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { description: '', amount: '', category: 'other' }] }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const totalAmount = formData.items.length > 0 
    ? formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    : (parseFloat(formData.amount) || 0);

  const saveExpense = async () => {
    try {
      const data = { 
        ...formData, 
        amount: totalAmount,
        items: formData.items.map(item => ({...item, amount: parseFloat(item.amount) || 0}))
      };
      if (editingExpense) {
        await base44.entities.TrainerExpense.update(editingExpense.id, data);
        toast.success("Expense updated");
      } else {
        await base44.entities.TrainerExpense.create({ ...data, trainer_id: user.id });
        toast.success("Expense added");
      }
      queryClient.invalidateQueries(['trainerExpenses']);
      setIsOpen(false);
    } catch (e) {
      toast.error("Failed to save expense");
    }
  };

  const deleteExpense = async (id) => {
    if (confirm("Delete this expense?")) {
      await base44.entities.TrainerExpense.delete(id);
      queryClient.invalidateQueries(['trainerExpenses']);
      toast.success("Expense deleted");
    }
  };

  const irsCategories = [
    { value: 'advertising', label: 'Advertising' },
    { value: 'car_truck', label: 'Car & Truck Expenses' },
    { value: 'commissions_fees', label: 'Commissions & Fees' },
    { value: 'contract_labor', label: 'Contract Labor' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'interest', label: 'Interest' },
    { value: 'legal_professional', label: 'Legal & Professional' },
    { value: 'office_expense', label: 'Office Expense' },
    { value: 'rent_lease', label: 'Rent or Lease' },
    { value: 'repairs_maintenance', label: 'Repairs & Maintenance' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'taxes_licenses', label: 'Taxes & Licenses' },
    { value: 'travel_meals', label: 'Travel & Meals' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'other', label: 'Other Expenses' },
    { value: 'software', label: 'Software / Subscriptions' },
    { value: 'equipment', label: 'Equipment' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Expenses</h2>
        <Button onClick={() => { setEditingExpense(null); setIsOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      <div className="space-y-2">
        {expenses.map(exp => (
          <div key={exp.id} className="flex flex-col p-4 rounded-xl border border-border bg-secondary transition-all hover:bg-accent">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  {exp.title}
                  <span className="text-[10px] uppercase tracking-wider bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                    {irsCategories.find(c => c.value === exp.category)?.label || exp.category}
                  </span>
                  {exp.items?.length > 0 && (
                    <span className="text-[10px] uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Itemized</span>
                  )}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">{exp.date} {exp.vendor && `• ${exp.vendor}`} {exp.notes && `• ${exp.notes}`}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-red-400">-${exp.amount.toFixed(2)}</span>
                <div className="flex items-center gap-1 border-l border-border pl-4">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingExpense(exp); setIsOpen(true); }}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteExpense(exp.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </div>
            {exp.items?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border text-sm">
                <p className="text-muted-foreground mb-2 font-medium">Line Items:</p>
                <div className="space-y-1">
                  {exp.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-muted-foreground">
                      <span>{item.description} <span className="text-gray-600 text-xs ml-1">({irsCategories.find(c => c.value === item.category)?.label || item.category})</span></span>
                      <span>${(item.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-xl">
            No expenses recorded yet. Keep track of your business spending!
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card text-foreground border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'New Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title / Receipt Name</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input-frosted" placeholder="E.g., Walmart Trip" />
              </div>
              <div className="space-y-2">
                <Label>Vendor / Payee</Label>
                <Input value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} className="input-frosted" placeholder="E.g., Walmart" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="input-frosted" />
              </div>
              {formData.items.length === 0 && (
                <div className="space-y-2">
                  <Label>Total Amount ($)</Label>
                  <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="input-frosted" placeholder="0.00" />
                </div>
              )}
            </div>
            
            {formData.items.length === 0 && (
              <div className="space-y-2">
                <Label>Main Category (IRS Schedule C)</Label>
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="input-frosted"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {irsCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-muted-foreground">Itemized Breakdown (Optional)</Label>
                <Button variant="outline" size="sm" onClick={addItem} className="h-8 text-xs gap-1 border-border text-foreground hover:bg-accent">
                  <Plus className="w-3 h-3" /> Add Line Item
                </Button>
              </div>
              
              {formData.items.length > 0 && (
                <div className="space-y-3">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-secondary p-3 rounded-lg border border-border">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} className="input-frosted h-8 text-sm" placeholder="Item name" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Amount ($)</Label>
                          <Input type="number" step="0.01" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} className="input-frosted h-8 text-sm" placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">IRS Category</Label>
                          <Select value={item.category} onValueChange={v => updateItem(idx, 'category', v)}>
                            <SelectTrigger className="input-frosted h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-60">
                              {irsCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="mt-5 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-right font-medium text-foreground p-2">
                    Total: ${totalAmount.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label>Notes (Optional)</Label>
              <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-frosted" />
            </div>
            
            <Button onClick={saveExpense} className="w-full mt-4" disabled={!formData.title || (formData.items.length === 0 && !formData.amount)}>
              Save {formData.items.length > 0 ? 'Itemized Expense' : 'Expense'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}