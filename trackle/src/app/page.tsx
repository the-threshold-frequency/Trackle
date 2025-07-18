'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { Loader2, CheckCircle, CalendarClock, ClipboardList, ListChecks } from 'lucide-react';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [sprintGoal, setSprintGoal] = useState<string | null>(null);
  const [standupsLogged, setStandupsLogged] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [sprintStats, setSprintStats] = useState({
    total: 0,
    backlog: 0,
    todo: 0,
    inProgress: 0,
    done: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const { data: activeSprint } = await supabase
        .from('sprints')
        .select('id, goal')
        .eq('is_active', true)
        .single();

      setSprintGoal(activeSprint?.goal || null);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('sprint_id', activeSprint?.id);

      const { data: standups } = await supabase.from('standups').select('*');
      setStandupsLogged(standups?.length || 0);

      const counts = {
        total: tasks?.length || 0,
        backlog: tasks?.filter(t => t.status === 'Backlog').length || 0,
        todo: tasks?.filter(t => t.status === 'To Do').length || 0,
        inProgress: tasks?.filter(t => t.status === 'In Progress').length || 0,
        done: tasks?.filter(t => t.status === 'Done').length || 0
      };

      setCompletedTasks(tasks?.filter(t => t.status === 'Done') || []);
      setSprintStats(counts);
      setLoading(false);
    };

    fetchStats();
  }, []);

  const progressPercent = sprintStats.total
    ? Math.round((sprintStats.done / sprintStats.total) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-center text-cyan-400 drop-shadow"
        >
          🧭 Trackle: Sprint into Productivity
        </motion.h1>

        <p className="text-center text-cyan-200 text-sm">
          Made for solo sprints. Reflect. Plan. Execute. 🧠
        </p>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin h-8 w-8 text-cyan-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#15151f] border border-cyan-700/30 shadow-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-2">
                  <ClipboardList className="text-cyan-400" size={28} />
                  <div>
                    <p className="text-xl font-semibold">{sprintStats.total}</p>
                    <p className="text-sm text-cyan-100">Total Tasks in Sprint</p>
                    <Link href="/backlog" className="text-xs underline text-cyan-300">View all tasks</Link>
                  </div>
                </div>
                <Progress value={progressPercent} className="mt-2 bg-cyan-900" />
                <p className="text-xs text-cyan-200 mt-1">Progress: {progressPercent}%</p>
              </CardContent>
            </Card>

            <Card className="bg-[#15151f] border border-cyan-700/30 shadow-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-2">
                  <CheckCircle className="text-green-400" size={28} />
                  <div>
                    <p className="text-xl font-semibold">{sprintStats.done}</p>
                    <p className="text-sm text-cyan-100">Completed Tasks</p>
                  </div>
                </div>
                <ul className="list-disc list-inside text-sm text-cyan-200">
                  {completedTasks.slice(0, 3).map(t => (
                    <li key={t.id}>{t.title}</li>
                  ))}
                  {completedTasks.length > 3 && <li>...and more</li>}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[#15151f] border border-cyan-700/30 shadow-xl col-span-1 md:col-span-2">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <CalendarClock className="text-yellow-300" size={28} />
                  <div>
                    <p className="text-xl font-semibold">
                      {sprintGoal || 'No Active Sprint'}
                    </p>
                    <p className="text-sm text-cyan-100">Current Sprint</p>
                    <div className="text-xs text-cyan-200 mt-2 space-y-1">
                      <p>Backlog: {sprintStats.backlog}</p>
                      <p>To Do: {sprintStats.todo}</p>
                      <p>In Progress: {sprintStats.inProgress}</p>
                      <p>Done: {sprintStats.done}</p>
                    </div>
                    <Link href="/sprint-board" className="text-xs underline text-cyan-300 mt-2 inline-block">Go to Sprint Board</Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#15151f] border border-cyan-700/30 shadow-xl">
              <CardContent className="p-5 flex items-center gap-4">
                <ListChecks className="text-orange-400" size={28} />
                <div>
                  <p className="text-xl font-semibold">{standupsLogged}</p>
                  <p className="text-sm text-cyan-100">Standups Logged</p>
                  <Link href="/standup" className="text-xs underline text-cyan-300">View Standups</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
