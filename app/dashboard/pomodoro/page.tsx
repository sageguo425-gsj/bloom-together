'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Task } from '@/lib/types/task';
import { usePomodoro } from '@/lib/contexts/PomodoroContext';
import { playNotificationSound } from '@/lib/utils/audio';
import RecentSessions from './components/RecentSessions';
import WhiteNoisePlayer from './components/WhiteNoisePlayer';

export default function PomodoroPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // 使用全局 Context
  const {
    pomodoroTimer,
    selectedTask,
    setSelectedTask,
    workDuration,
    setWorkDuration,
    breakDuration,
    setBreakDuration,
    completedSessions,
    handleStart,
    handlePause,
    handleReset,
    setUserId,
  } = usePomodoro();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setUserId(user.id);
      await loadTasks(user.id);
      setLoading(false);
    };

    getUser();
  }, [router, supabase]);

  useEffect(() => {
    // 键盘快捷键
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (pomodoroTimer.status === 'running') {
          handlePause();
        } else if (pomodoroTimer.status === 'paused' || pomodoroTimer.status === 'idle') {
          handleStart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pomodoroTimer.status, isFullscreen]);

  const loadTasks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'completed')
        .order('date', { ascending: false })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };

  const handleStartWithSound = async () => {
    await handleStart();
    playNotificationSound();
  };

  const handleDurationChange = (newWorkDuration: number, newBreakDuration: number) => {
    setWorkDuration(newWorkDuration);
    setBreakDuration(newBreakDuration);
    setShowDurationModal(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
            filter: 'brightness(0.85) blur(3px)',
          }}
        />
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/30 via-teal-800/20 to-green-900/35 -z-10" />

        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-light">加载中...</p>
        </div>
      </div>
    );
  }

  // 全屏模式
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-500 via-teal-600 to-green-600 flex items-center justify-center z-50 p-4">
        <div className="text-center text-white">
          <p className="text-lg sm:text-2xl font-light mb-4 opacity-90">
            {pomodoroTimer.mode === 'work' ? '专注工作' : '休息时间'}
          </p>
          <div className="text-7xl sm:text-9xl lg:text-[12rem] font-extralight mb-6 sm:mb-8 tracking-wider">
            {formatTime(pomodoroTimer.timeLeft)}
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-8">
            {pomodoroTimer.status === 'running' ? (
              <button
                onClick={handlePause}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center"
              >
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={handleStartWithSound}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all flex items-center justify-center"
              >
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            )}
            <button
              onClick={handleReset}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all flex items-center justify-center"
            >
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="text-white/60 hover:text-white text-xs sm:text-sm font-light"
          >
            按 ESC 退出全屏
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* 全屏背景图片 */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
          filter: 'brightness(0.85) blur(3px)',
        }}
      />

      {/* 渐变遮罩层 */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/30 via-teal-800/20 to-green-900/35 -z-10" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* 左侧：番茄钟主界面 */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl sm:rounded-3xl p-6 sm:p-12 lg:p-16 text-white shadow-2xl flex-1 flex flex-col">
              {/* 关联任务选择 */}
              <div className="flex items-center justify-center mb-4 sm:mb-8">
                <div className="relative w-full sm:w-auto">
                  <button
                    onClick={() => pomodoroTimer.status === 'idle' && setShowTaskSelector(!showTaskSelector)}
                    disabled={pomodoroTimer.status !== 'idle'}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-full transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                      pomodoroTimer.status === 'idle'
                        ? 'hover:bg-white/30 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    title={pomodoroTimer.status !== 'idle' ? '番茄钟运行时无法修改' : ''}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm font-medium truncate">
                      {selectedTask ? selectedTask.title : '选择关联任务'}
                    </span>
                  </button>

                  {/* 任务选择下拉 */}
                  {showTaskSelector && (
                    <div className="absolute top-full mt-2 left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-10">
                      <div className="max-h-64 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedTask(null);
                            setShowTaskSelector(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-all text-sm text-gray-600 border-b border-gray-100"
                        >
                          不关联任务
                        </button>
                        {tasks.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-6">暂无待办任务</p>
                        ) : (
                          tasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => {
                                setSelectedTask(task);
                                setShowTaskSelector(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-all text-sm text-gray-900 border-b border-gray-100 last:border-b-0"
                            >
                              {task.title}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 倒计时显示 */}
              <div className="text-center mb-6 sm:mb-12 flex-1 flex flex-col justify-center">
                <button
                  onClick={() => pomodoroTimer.status === 'idle' && setShowDurationModal(true)}
                  disabled={pomodoroTimer.status !== 'idle'}
                  className={`text-6xl sm:text-8xl lg:text-9xl font-extralight mb-4 sm:mb-8 tracking-wider transition-transform ${
                    pomodoroTimer.status === 'idle'
                      ? 'hover:scale-105 cursor-pointer'
                      : 'cursor-not-allowed opacity-90'
                  }`}
                  title={pomodoroTimer.status === 'idle' ? '点击修改时长' : '番茄钟运行时无法修改时长'}
                >
                  {formatTime(pomodoroTimer.timeLeft)}
                </button>

                <p className="text-sm sm:text-lg font-light mb-4 sm:mb-8 opacity-90">
                  {pomodoroTimer.mode === 'work' ? '专注工作' : '休息时间'} · 已完成 {completedSessions} 个番茄钟
                </p>

                {/* 进度条 */}
                <div className="w-full h-2 sm:h-3 bg-white/20 rounded-full overflow-hidden mb-6 sm:mb-12">
                  <div
                    className="h-full bg-white/80 transition-all duration-1000 rounded-full"
                    style={{ width: `${pomodoroTimer.progress}%` }}
                  ></div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                  {pomodoroTimer.status === 'running' ? (
                    <button
                      onClick={handlePause}
                      className="px-8 sm:px-12 lg:px-16 py-3 sm:py-4 lg:py-5 bg-white/95 text-emerald-700 rounded-full font-medium text-base sm:text-lg lg:text-xl hover:bg-white transition-all shadow-lg hover:scale-105"
                    >
                      暂停
                    </button>
                  ) : (
                    <button
                      onClick={handleStartWithSound}
                      className="px-8 sm:px-12 lg:px-16 py-3 sm:py-4 lg:py-5 bg-white/95 text-emerald-700 rounded-full font-medium text-base sm:text-lg lg:text-xl hover:bg-white transition-all shadow-lg hover:scale-105"
                    >
                      {pomodoroTimer.status === 'idle' ? '开始' : '继续'}
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className="px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 bg-white/20 backdrop-blur-sm text-white rounded-full font-medium text-sm sm:text-base lg:text-lg hover:bg-white/30 transition-all"
                  >
                    重置
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-3 sm:p-4 lg:p-5 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-all"
                    title="按 F 键切换全屏"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 快捷键提示 */}
              <div className="text-center text-xs sm:text-sm text-white/60 space-x-3 sm:space-x-6 hidden sm:block">
                <span>空格：开始/暂停</span>
                <span>F：全屏</span>
                <span>ESC：退出全屏</span>
              </div>
            </div>
          </div>

          {/* 右侧：最近记录和白噪音 */}
          <div className="flex flex-col gap-6">
            {user && <RecentSessions user={user} />}
            {user && <WhiteNoisePlayer user={user} />}
          </div>
        </div>
      </main>

      {/* 时长设置模态框 */}
      {showDurationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-light text-gray-900 mb-6">设置番茄钟时长</h3>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  工作时长（分钟）
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={workDuration}
                  onChange={(e) => setWorkDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-center text-2xl font-light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  休息时长（分钟）
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-center text-2xl font-light"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDurationModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={() => handleDurationChange(workDuration, breakDuration)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
