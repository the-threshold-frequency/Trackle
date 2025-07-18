'use client';

import React from 'react'; // ✅ Add this line
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Loader2, Trash2, Pencil } from 'lucide-react';

// ✅ Task interface
interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'Low' | 'Medium' | 'High';
  estimate?: string;
  status: 'Backlog' | 'To Do' | 'In Progress' | 'Done';
  created_at?: string;
  sprint_id?: string;
}

export default function BacklogPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [estimate, setEstimate] = useState('');
  const [status, setStatus] = useState<Task['status']>('Backlog');
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasksAndSprint = async () => {
      setLoading(true);
      const { data: sprint } = await supabase
        .from('sprints')
        .select('id')
        .eq('is_active', true)
        .single();

      setActiveSprintId(sprint?.id || null);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      setTasks((tasksData as Task[]) || []);
      setLoading(false);
    };
    fetchTasksAndSprint();
  }, []);

  const handleAddTask = async () => {
    if (!title.trim()) return;

    const { error } = await supabase.from('tasks').insert([
      {
        title,
        description,
        due_date: dueDate || null,
        priority,
        estimate,
        status,
        sprint_id: activeSprintId
      }
    ]);

    if (!error) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('Medium');
      setEstimate('');
      setStatus('Backlog');
      setDialogOpen(false);

      const { data: updatedTasks } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      setTasks((updatedTasks as Task[]) || []);
    } else {
      console.error('❌ Failed to add task:', error.message);
    }
  };

  const handleUpdateTask = async () => {
    if (!editTask) return;

    const { error } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        due_date: dueDate || null,
        priority,
        estimate,
        status
      })
      .eq('id', editTask.id);

    if (!error) {
      setEditDialogOpen(false);
      setEditTask(null);

      const { data: updatedTasks } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      setTasks((updatedTasks as Task[]) || []);
    } else {
      console.error('❌ Failed to update task:', error.message);
    }
  };

  const openEditModal = (task: Task) => {
    setEditTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date || '');
    setPriority(task.priority);
    setEstimate(task.estimate || '');
    setStatus(task.status);
    setEditDialogOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleStatusChange = async (id: string, newStatus: Task['status']) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)));
  };

  const getBorderClass = (task: Task) => {
    if (task.status === 'Done') return 'border-green-500';
    if (task.priority === 'High') return 'border-red-500';
    if (task.priority === 'Medium') return 'border-yellow-500';
    if (task.priority === 'Low') return 'border-green-300';
    return 'border-cyan-800';
  };

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-cyan-400">📋 Backlog</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-600 hover:bg-cyan-700">➕ Add Task</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2f] border border-cyan-800">
              <DialogHeader>
                <DialogTitle className="text-cyan-300">New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task Title" className="bg-[#1f1f2e] text-white" />
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Task Description" className="bg-[#1f1f2e] text-white" />
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#1f1f2e] text-white" />
                <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="bg-[#1f1f2e] text-white w-full p-2 rounded-md">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <Input value={estimate} onChange={e => setEstimate(e.target.value)} placeholder="Estimate (e.g. 3h, 1d)" className="bg-[#1f1f2e] text-white" />
                <select value={status} onChange={e => setStatus(e.target.value as Task['status'])} className="bg-[#1f1f2e] text-white w-full p-2 rounded-md">
                  <option value="Backlog">Backlog</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <DialogFooter>
                <Button onClick={handleAddTask} className="bg-cyan-600">Add Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-[#1a1a2f] border border-cyan-800">
            <DialogHeader>
              <DialogTitle className="text-cyan-300">Edit Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task Title" className="bg-[#1f1f2e] text-white" />
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Task Description" className="bg-[#1f1f2e] text-white" />
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#1f1f2e] text-white" />
              <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="bg-[#1f1f2e] text-white w-full p-2 rounded-md">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <Input value={estimate} onChange={e => setEstimate(e.target.value)} placeholder="Estimate (e.g. 3h, 1d)" className="bg-[#1f1f2e] text-white" />
              <select value={status} onChange={e => setStatus(e.target.value as Task['status'])} className="bg-[#1f1f2e] text-white w-full p-2 rounded-md">
                <option value="Backlog">Backlog</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateTask} className="bg-cyan-600">Update Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-cyan-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <Card key={task.id} className={`bg-[#15151f] border-2 ${getBorderClass(task)}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{task.title}</h2>
                      <p className="text-sm text-white/70">{task.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" className="text-blue-400 hover:text-blue-600" onClick={() => openEditModal(task)}>
                        <Pencil size={18} />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                  <select value={task.status} className="bg-[#1f1f2e] text-white w-full p-2 rounded-md" onChange={e => handleStatusChange(task.id, e.target.value as Task['status'])}>
                    <option value="Backlog">Backlog</option>
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
