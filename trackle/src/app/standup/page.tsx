'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Standup {
  id: string;
  yesterday: string;
  today: string;
  blockers: string;
  created_at: string;
}

export default function StandupPage() {
  const [standups, setStandups] = useState<Standup[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ yesterday: '', today: '', blockers: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchStandups = async () => {
      setLoading(true);
      const { data } = await supabase.from('standups').select('*').order('created_at', { ascending: false });
      setStandups(data || []);
      setLoading(false);
    };
    fetchStandups();
  }, []);

  const handleSubmit = async () => {
    if (!form.yesterday || !form.today) return;
    setSubmitting(true);
    const { error } = await supabase.from('standups').insert([form]);
    if (!error) {
      setStandups(prev => [
        { id: crypto.randomUUID(), ...form, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setForm({ yesterday: '', today: '', blockers: '' });
    }
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">📝 Daily Standup</h1>

      <Card className="bg-[#15151f] border border-cyan-700 mb-6">
        <CardContent className="space-y-4 p-5">
          <Textarea
            className="bg-[#1f1f2e] text-white"
            placeholder="What did you do yesterday?"
            value={form.yesterday}
            onChange={e => setForm({ ...form, yesterday: e.target.value })}
          />
          <Textarea
            className="bg-[#1f1f2e] text-white"
            placeholder="What will you do today?"
            value={form.today}
            onChange={e => setForm({ ...form, today: e.target.value })}
          />
          <Textarea
            className="bg-[#1f1f2e] text-white"
            placeholder="Any blockers? (optional)"
            value={form.blockers}
            onChange={e => setForm({ ...form, blockers: e.target.value })}
          />
          <Button disabled={submitting} onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-600">
            {submitting ? 'Submitting...' : 'Submit Standup'}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin h-8 w-8 text-cyan-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {standups.map(s => (
            <Card key={s.id} className="bg-[#15151f] border border-cyan-800">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm text-cyan-200">{format(new Date(s.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                <p><strong>Yesterday:</strong> {s.yesterday}</p>
                <p><strong>Today:</strong> {s.today}</p>
                {s.blockers && <p><strong>Blockers:</strong> {s.blockers}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
