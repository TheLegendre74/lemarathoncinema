'use client';
import { useEffect, useState, useCallback } from 'react';

interface Props {
  message: string;
  onDone: () => void;
  speed?: number;
  autoAdvance?: boolean;
  autoDelay?: number;
}

export default function TextBox({ message, onDone, speed = 25, autoAdvance = false, autoDelay = 1200 }: Props) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i >= message.length) {
        setDisplayed(message);
        setDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(message.slice(0, i));
      }
    }, speed);
    return () => clearInterval(interval);
  }, [message, speed]);

  useEffect(() => {
    if (!done) return;
    if (autoAdvance) {
      const t = setTimeout(onDone, autoDelay);
      return () => clearTimeout(t);
    }
  }, [done, autoAdvance, autoDelay, onDone]);

  const handleClick = useCallback(() => {
    if (!done) {
      setDisplayed(message);
      setDone(true);
    } else {
      onDone();
    }
  }, [done, message, onDone]);

  return (
    <div
      onClick={handleClick}
      className="rounded-xl px-5 py-4 cursor-pointer select-none"
      style={{
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid rgba(232,196,106,0.2)',
        minHeight: 64,
      }}
    >
      <p className="font-body text-sm leading-relaxed" style={{ color: '#e8e6e3' }}>
        {displayed}
        {!done && <span className="animate-pulse">▋</span>}
      </p>
      {done && (
        <div className="text-right mt-1">
          <span className="text-[10px] animate-pulse" style={{ color: 'var(--text3)' }}>▼ clic pour continuer</span>
        </div>
      )}
    </div>
  );
}
