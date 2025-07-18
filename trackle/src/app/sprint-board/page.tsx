'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// 🧩 Task Interface
interface Task {
  id: string;
  title: string;
  description?: string;
  comment?: string;
  status: 'Backlog' | 'To Do' | 'In Progress' | 'Done';
}

// 🧩 Draggable Task Card
interface DraggableCardProps {
  task: Task;
  onCommentChange: (taskId: string, comment: string) => void;
  isDragging?: boolean;
}

function DraggableCard({ task, onCommentChange, isDragging = false }: DraggableCardProps) {
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
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`bg-[#15151f] border-2 border-cyan-800 mb-2 ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        <CardContent className="p-4 space-y-2">
          <h2 className="text-lg font-semibold text-white">{task.title}</h2>
          <p className="text-sm text-white/70">{task.description}</p>
          <Textarea
            placeholder="Add a comment..."
            className="bg-[#1f1f2e] text-white"
            value={task.comment || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onCommentChange(task.id, e.target.value)
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

// 🧩 Droppable Column
function DroppableColumn({ status, children }: { status: Task['status']; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className="bg-[#1a1a2f] rounded-xl p-4 border border-cyan-800 min-h-[200px]"
    >
      <h2 className="text-xl font-semibold text-cyan-300 mb-4">{status}</h2>
      {children}
    </div>
  );
}

// 🧠 Sprint Board Page
export default function SprintBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const { data } = await supabase.from('tasks').select('*');
      setTasks((data as Task[]) || []);
      setLoading(false);
    };
    fetchTasks();
  }, []);

  const statuses: Task['status'][] = ['Backlog', 'To Do', 'In Progress', 'Done'];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over || active.id === over.id) return;

    const newStatus = over.id as Task['status'];
    if (!statuses.includes(newStatus)) return;

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', active.id as string);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: newStatus } : t
        )
      );
    }
  };

  const handleCommentChange = async (taskId: string, comment: string) => {
    await supabase.from('tasks').update({ comment }).eq('id', taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, comment } : t))
    );
  };

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">📌 Sprint Board</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin h-8 w-8 text-cyan-500" />
        </div>
      ) : (
        <DndContext
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
                  {tasks
                    .filter((t) => t.status === status)
                    .map((task) => (
                      <DraggableCard
                        key={task.id}
                        task={task}
                        onCommentChange={handleCommentChange}
                      />
                    ))}
                </SortableContext>
              </DroppableColumn>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <DraggableCard
                task={activeTask}
                onCommentChange={() => {}}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </main>
  );
}
