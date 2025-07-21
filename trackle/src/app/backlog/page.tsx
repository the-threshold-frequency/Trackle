'use client';

import React, { useEffect, useState } from 'react';
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
import { Loader2, Trash2, Pencil, CheckCircle, XCircle } from 'lucide-react';

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

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  due_date?: string;
  created_at: string;
  is_completed: boolean;
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
  const [now, setNow] = useState(new Date());
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<Record<string, string>>({});

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

      const taskIds = (tasksData as Task[])?.map(t => t.id);
      if (taskIds.length) fetchAllSubtasks(taskIds);
    };
    fetchTasksAndSprint();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());

    }, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  const fetchAllSubtasks = async (taskIds: string[]) => {
    const { data } = await supabase.from('subtasks').select('*').in('task_id', taskIds);
    if (data) {
      const grouped: Record<string, Subtask[]> = {};
      data.forEach(st => {
        if (!grouped[st.task_id]) grouped[st.task_id] = [];
        grouped[st.task_id].push(st);
      });
      setSubtasks(grouped);
    }
  };

  const handleAddSubtask = async (taskId: string) => {
    const title = newSubtaskTitle[taskId];
    if (!title?.trim()) return;
    const { error } = await supabase.from('subtasks').insert([{ task_id: taskId, title }]);
    if (!error) {
      fetchAllSubtasks([taskId]);
      setNewSubtaskTitle(prev => ({ ...prev, [taskId]: '' }));
    }
  };

  const handleDeleteSubtask = async (subtaskId: string, taskId: string) => {
    await supabase.from('subtasks').delete().eq('id', subtaskId);
    fetchAllSubtasks([taskId]);
  };

  const toggleSubtaskCompletion = async (subtask: Subtask) => {
    await supabase.from('subtasks').update({ is_completed: !subtask.is_completed }).eq('id', subtask.id);
    fetchAllSubtasks([subtask.task_id]);
  };

  const getTimeRemaining = (dueDate?: string, created_at?: string) => {
    if (!dueDate || !created_at) return null;
    const dueTime = new Date(`${dueDate}T${new Date(created_at).toTimeString().split(' ')[0]}`);
    const diff = dueTime.getTime() - now.getTime();
    if (diff <= 0) return '⏰ Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `⏳ ${hours}h ${minutes}m left`;
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
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">📋 Backlog</h1>
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
                      {getTimeRemaining(task.due_date, task.created_at) && (
                        <p className="text-xs text-white/60 mt-1">{getTimeRemaining(task.due_date, task.created_at)}</p>
                      )}
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

                  {subtasks[task.id]?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {subtasks[task.id].map(st => {
                        const isExpired = st.due_date && new Date(st.due_date) < now && !st.is_completed;
                        return (
                          <div key={st.id} className={`flex items-center justify-between text-sm ${isExpired ? 'text-red-400' : 'text-white/80'}`}>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={st.is_completed}
                                onChange={() => toggleSubtaskCompletion(st)}
                                className="accent-cyan-600"
                              />
                              <span className={st.is_completed ? 'line-through' : ''}>{st.title}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span>{getTimeRemaining(st.due_date, st.created_at)}</span>
                              <button onClick={() => handleDeleteSubtask(st.id, task.id)}>
                                <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newSubtaskTitle[task.id] || ''}
                      onChange={e => setNewSubtaskTitle(prev => ({ ...prev, [task.id]: e.target.value }))}
                      placeholder="Add subtask"
                      className="bg-[#1f1f2e] text-white flex-1"
                    />
                    <Button onClick={() => handleAddSubtask(task.id)} className="bg-cyan-600">➕</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
