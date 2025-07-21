'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'Backlog' | 'To Do' | 'In Progress' | 'Done';
  sprint_id: string;
  tags?: string[];
}

interface Comment {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
}

interface Sprint {
  id: string;
  goal: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description?: string;
}

interface DraggableCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

function DraggableCard({ task, onClick, isDragging = false }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableDragging ? 0.5 : 1,
    zIndex: sortableDragging ? 50 : 1,
    touchAction: 'none',
    cursor: 'grab',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} onPointerDown={(e) => e.stopPropagation()}>
        <Card
          className={`bg-[#15151f] border-2 border-cyan-800 mb-2 ${isDragging ? 'opacity-50' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <CardContent className="p-3">
            <h2 className="text-sm font-medium text-white truncate">{task.title}</h2>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DroppableColumn({ status, children }: { status: Task['status']; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className="bg-[#1a1a2f] rounded-xl p-4 border border-cyan-800 min-h-[200px] max-h-[80vh] overflow-y-auto touch-action-none">
      <h2 className="text-xl font-semibold text-cyan-300 mb-4">{status}</h2>
      {children}
    </div>
  );
}

export default function SprintBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [newSprint, setNewSprint] = useState({ goal: '', start_date: '', end_date: '', description: '' });
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [newTag, setNewTag] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: sprintData } = await supabase.from('sprints').select('*').order('start_date', { ascending: false });
      setSprints(sprintData || []);
      const activeSprint = sprintData?.find(s => s.is_active);
      setSelectedSprintId(activeSprint?.id || null);
      if (activeSprint?.id) fetchTasks(activeSprint.id);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchTasks = async (sprintId: string) => {
    setLoading(true);
    const { data: taskData } = await supabase.from('tasks').select('*').eq('sprint_id', sprintId);
    setTasks((taskData as Task[]) || []);
    setLoading(false);
  };

  const fetchComments = async (taskId: string) => {
    const { data: commentData } = await supabase.from('comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
    setComments(commentData || []);
  };

  const handleAddComment = async () => {
    if (!viewTask || !newComment.trim()) return;
    const { error } = await supabase.from('comments').insert([{ task_id: viewTask.id, content: newComment.trim() }]);
    if (!error) {
      setNewComment('');
      fetchComments(viewTask.id);
    }
  };

  const handleEditComment = async (id: string) => {
    if (!editingCommentContent.trim()) return;
    await supabase.from('comments').update({ content: editingCommentContent }).eq('id', id);
    setEditingCommentId(null);
    setEditingCommentContent('');
    if (viewTask) fetchComments(viewTask.id);
  };

  const handleDeleteComment = async (id: string) => {
    await supabase.from('comments').delete().eq('id', id);
    if (viewTask) fetchComments(viewTask.id);
  };

  const handleAddTag = async () => {
    if (!viewTask || !newTag.trim()) return;
    const updatedTags = [...(viewTask.tags || []), newTag.trim()];
    const { error } = await supabase.from('tasks').update({ tags: updatedTags }).eq('id', viewTask.id);
    if (!error) {
      setViewTask({ ...viewTask, tags: updatedTags });
      setTasks(prev => prev.map(t => t.id === viewTask.id ? { ...t, tags: updatedTags } : t));
      setNewTag('');
    }
  };

  const handleSprintChange = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    fetchTasks(sprintId);
  };

  const handleCreateSprint = async () => {
    const { goal, start_date, end_date, description } = newSprint;
    if (!goal || !start_date || !end_date) return;
    const { error } = await supabase.from('sprints').insert([{ goal, start_date, end_date, description, is_active: false, created_at: new Date().toISOString() }]);
    if (!error) {
      setShowSprintForm(false);
      setNewSprint({ goal: '', start_date: '', end_date: '', description: '' });
      const { data: updatedSprints } = await supabase.from('sprints').select('*').order('start_date', { ascending: false });
      setSprints(updatedSprints || []);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over || active.id === over.id) return;

    const task = tasks.find(t => t.id === active.id);
    if (!task) return;

    const overColumnId = over?.id;
    const validStatuses: Task['status'][] = ['Backlog', 'To Do', 'In Progress', 'Done'];
    if (!validStatuses.includes(overColumnId as Task['status'])) return;

    const newStatus = overColumnId as Task['status'];
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', active.id as string);
    if (!error) setTasks((prev) => prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t)));
  };

  const statuses: Task['status'][] = ['Backlog', 'To Do', 'In Progress', 'Done'];

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white p-6">
      <Dialog open={!!viewTask} onOpenChange={(open) => {
        if (!open) {
          setViewTask(null);
          setComments([]);
        } else if (viewTask) {
          fetchComments(viewTask.id);
        }
      }}>
        <DialogContent className="bg-[#1a1a2f] border border-cyan-800">
          {viewTask && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-cyan-300">{viewTask.title}</h2>
              <p className="text-sm text-white/70">{viewTask.description}</p>
              {viewTask.due_date && (
                <p className="text-sm text-white/50">
                  Due: {new Date(viewTask.due_date).toLocaleString()} {' '}
                  ({new Date(viewTask.due_date) < new Date()
                    ? 'Expired'
                    : `${Math.ceil((new Date(viewTask.due_date).getTime() - Date.now()) / (1000 * 60))} min left`})
                </p>
              )}
              {viewTask.tags && (
                <div className="flex flex-wrap gap-2">
                  {viewTask.tags.map(tag => (
                    <span key={tag} className="bg-cyan-800 text-white px-2 py-1 rounded text-xs">{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="bg-[#0f0f1a] text-white flex-1 px-2 py-1 rounded"
                  placeholder="Add new tag"
                />
                <button onClick={handleAddTag} className="px-3 py-1 bg-cyan-600 text-white rounded">Add</button>
              </div>
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start justify-between border border-cyan-700 p-2 rounded text-white text-sm gap-2">
                    {editingCommentId === c.id ? (
                      <div className="flex flex-col w-full">
                        <Textarea
                          value={editingCommentContent}
                          onChange={(e) => setEditingCommentContent(e.target.value)}
                          className="bg-[#0f0f1a] text-white mb-1"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleEditComment(c.id)} className="px-2 py-1 bg-green-600 rounded text-white text-xs">Save</button>
                          <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 bg-gray-600 rounded text-white text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1">{c.content}</span>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingCommentId(c.id); setEditingCommentContent(c.content); }} className="text-blue-400 hover:text-blue-600"><Pencil size={16} /></button>
                          <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  className="bg-[#0f0f1a] text-white flex-1"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button onClick={handleAddComment} className="px-3 py-2 bg-cyan-600 text-white rounded">Send</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin h-8 w-8 text-cyan-500" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statuses.map((status) => (
              <DroppableColumn key={status} status={status}>
                <SortableContext
                  id={status}
                  items={tasks.filter((t) => t.status === status).map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tasks.filter((t) => t.status === status).map((task) => (
                    <DraggableCard key={task.id} task={task} onClick={() => setViewTask(task)} />
                  ))}
                </SortableContext>
              </DroppableColumn>
            ))}
          </div>

          <DragOverlay>
            {activeTaskId ? (
              <DraggableCard task={tasks.find((t) => t.id === activeTaskId)!} onClick={() => {}} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </main>
  );
}
