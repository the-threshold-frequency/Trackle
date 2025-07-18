'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SprintTimer() {
  const [countdown, setCountdown] = useState('');
  const [sprintEndTime, setSprintEndTime] = useState<Date | null>(null);
  const [sprintStartTime, setSprintStartTime] = useState<Date | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipLocked, setTooltipLocked] = useState(false); // true when clicked
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchSprintDates = async () => {
      const { data: sprint } = await supabase
        .from('sprints')
        .select('start_date, end_date')
        .eq('is_active', true)
        .single();

      if (sprint?.end_date) setSprintEndTime(new Date(sprint.end_date));
      if (sprint?.start_date) setSprintStartTime(new Date(sprint.start_date));
    };

    fetchSprintDates();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!sprintEndTime) return;

      const now = new Date().getTime();
      const end = sprintEndTime.getTime();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown('Sprint Over');
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setCountdown(`${d}d ${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sprintEndTime]);

  const handleClick = () => {
    setShowTooltip(true);
    setTooltipLocked(true);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    hideTimerRef.current = setTimeout(() => {
      setTooltipLocked(false);
      setShowTooltip(false);
    }, 5000);
  };

  const handleMouseEnter = () => {
    if (!tooltipLocked) setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    if (!tooltipLocked) setShowTooltip(false);
  };

  if (!countdown) return null;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 text-cyan-100 px-4 py-2 rounded-full text-xs shadow-lg cursor-pointer transition-all duration-200 backdrop-blur-md bg-white/10 border border-cyan-400/30"
    >
      ⏳ Time Left: {countdown}
      {showTooltip && sprintStartTime && sprintEndTime && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-max text-xs bg-black/80 text-white rounded-lg px-3 py-2 shadow-lg backdrop-blur-md border border-cyan-500/20 z-50">
          <p>🚀 Start: {sprintStartTime.toDateString()}</p>
          <p>🏁 End: {sprintEndTime.toDateString()}</p>
        </div>
      )}
    </div>
  );
}
