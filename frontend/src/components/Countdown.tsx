import React, { useState, useEffect } from 'react';
import { getTimeDifference } from '../utils/date';
import { Clock, AlertCircle } from 'lucide-react';

interface CountdownProps {
  targetIso: string;
  type?: 'start' | 'end' | 'overstay';
  className?: string;
}

export const Countdown: React.FC<CountdownProps> = ({
  targetIso,
  type = 'end',
  className = '',
}) => {
  const [diff, setDiff] = useState(() => getTimeDifference(targetIso));

  useEffect(() => {
    setDiff(getTimeDifference(targetIso));
    const timer = setInterval(() => {
      setDiff(getTimeDifference(targetIso));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetIso]);

  if (type === 'start') {
    if (diff.isPast) {
      return (
        <div className={`flex items-center gap-1.5 text-xs font-medium text-emerald-400 ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>Active window has started</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium text-blue-400 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>Starts in: <strong className="font-mono">{diff.display}</strong></span>
      </div>
    );
  }

  // End or overstay
  if (diff.isPast) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-semibold text-rose-400 animate-pulse ${className}`}>
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Overstaying by: <strong className="font-mono">+{diff.display}</strong></span>
      </div>
    );
  }

  const isLow = diff.hours === 0 && diff.minutes < 10;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${
        isLow ? 'text-amber-400 animate-pulse' : 'text-slate-300'
      } ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-slate-400" />
      <span>
        Time remaining: <strong className="font-mono font-semibold">{diff.display}</strong>
      </span>
    </div>
  );
};
