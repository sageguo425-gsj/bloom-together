'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/lib/types/task';

interface PomodoroModalProps {
  task: Task;
  onClose: () => void;
}

// 右下角通知组件
function Toast({ message, emoji, onClose }: { message: string; emoji: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // 5秒后自动关闭

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-in-right">
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 p-4 min-w-[300px] max-w-[400px]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <span className="text-2xl">{emoji}</span>
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-medium mb-1">番茄钟提醒</p>
            <p className="text-gray-600 text-sm">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PomodoroModal({ task, onClose }: PomodoroModalProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastEmoji, setToastEmoji] = useState('');

  const showNotification = (message: string, emoji: string) => {
    setToastMessage(message);
    setToastEmoji(emoji);
    setShowToast(true);

    // 播放提示音（可选）
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {
        // 如果没有音频文件或播放失败，静默处理
      });
    } catch (error) {
      // 静默处理音频错误
    }
  };

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
            showNotification('🎉 番茄钟完成！休息一下吧！', '🎉');
            setMode('break');
            return 5 * 60;
          } else {
            showNotification('✨ 休息结束！继续加油！', '✨');
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

      {/* 右下角通知 */}
      {showToast && (
        <Toast
          message={toastMessage}
          emoji={toastEmoji}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
