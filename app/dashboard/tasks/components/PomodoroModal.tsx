'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types/task';

interface PomodoroModalProps {
  task: Task;
  onClose: () => void;
}

export default function PomodoroModal({ task, onClose }: PomodoroModalProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setIsRunning(true);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          if (mode === 'work') {
            alert('🎉 番茄钟完成！休息一下吧！');
            setMode('break');
            return 5 * 60;
          } else {
            alert('✨ 休息结束！继续加油！');
            setMode('work');
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🍅</span>
          </div>

          <h3 className="text-2xl font-light text-gray-900 mb-2">
            {mode === 'work' ? '专注时间' : '休息时间'}
          </h3>
          <p className="text-gray-600 text-sm mb-6">{task.title}</p>

          <div className="relative w-64 h-64 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="#f0f0f0"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke={mode === 'work' ? '#10b981' : '#3b82f6'}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${
                  2 * Math.PI * 120 * (1 - timeLeft / (mode === 'work' ? 25 * 60 : 5 * 60))
                }`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-light text-gray-900">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                开始
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                暂停
              </button>
            )}
            <button
              onClick={resetTimer}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              重置
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
