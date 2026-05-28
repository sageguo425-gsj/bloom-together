'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Task, TaskStatus, TaskFormData, TaskPriority } from '@/lib/types/task';
import { TASK_STATUS_LABELS } from '@/lib/types/task';
import TaskCard from './components/TaskCard';
import TaskForm from './components/TaskForm';
import PomodoroModal from './components/PomodoroModal';
import BatchActions from './components/BatchActions';
import { addExpForTaskCompletion } from '@/lib/services/expService';

export default function TasksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | TaskStatus>('all');
  const [viewMode, setViewMode] = useState<'date' | 'status' | 'priority'>('date');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'created'>('date');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      loadTasks(user.id);
    };

    getUser();
  }, [router, supabase]);

  const loadTasks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreateTask = async (formData: TaskFormData) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            ...formData,
            user_id: user.id,
            status: formData.status || 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setTasks([...tasks, data]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('创建任务失败:', error);
      alert('创建任务失败，请重试');
    }
  };

  const handleUpdateTask = async (formData: TaskFormData) => {
    if (!editingTask) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(formData)
        .eq('id', editingTask.id)
        .select()
        .single();

      if (error) throw error;
      setTasks(tasks.map((t) => (t.id === editingTask.id ? data : t)));
      setEditingTask(null);
    } catch (error) {
      console.error('更新任务失败:', error);
      alert('更新任务失败，请重试');
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // 如果任务被标记为完成，增加经验值
      if (status === 'completed' && user) {
        const result = await addExpForTaskCompletion(user.id);

        if (result.success && result.leveledUp) {
          alert(`🎉 恭喜升级到 Lv.${result.newLevel}！`);
        }
      }

      setTasks(tasks.map((t) => (t.id === taskId ? data : t)));
    } catch (error) {
      console.error('更新任务状态失败:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除任务失败，请重试');
    }
  };

  const handleDuplicateTask = async (task: Task) => {
    if (!user) return;

    const formData: TaskFormData = {
      title: `${task.title} (副本)`,
      description: task.description,
      priority: task.priority,
      tags: task.tags,
      date: new Date().toISOString().split('T')[0],
      start_time: task.start_time,
      end_time: task.end_time,
      estimated_duration: task.estimated_duration,
      project_id: task.project_id,
      habit_id: task.habit_id,
    };

    await handleCreateTask(formData);
  };

  const handleBatchDelete = async (taskIds: string[]) => {
    try {
      const { error } = await supabase.from('tasks').delete().in('id', taskIds);

      if (error) throw error;
      setTasks(tasks.filter((t) => !taskIds.includes(t.id)));
    } catch (error) {
      console.error('批量删除失败:', error);
      alert('批量删除失败，请重试');
    }
  };

  const handleBatchMove = async (taskIds: string[], newDate: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ date: newDate })
        .in('id', taskIds);

      if (error) throw error;
      setTasks(
        tasks.map((t) => (taskIds.includes(t.id) ? { ...t, date: newDate } : t))
      );
    } catch (error) {
      console.error('批量移动失败:', error);
      alert('批量移动失败，请重试');
    }
  };

  const handleBatchStatusChange = async (taskIds: string[], status: TaskStatus) => {
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .in('id', taskIds);

      if (error) throw error;
      setTasks(
        tasks.map((t) =>
          taskIds.includes(t.id) ? { ...t, status, completed_at: updateData.completed_at } : t
        )
      );
    } catch (error) {
      console.error('批量更新状态失败:', error);
      alert('批量更新状态失败，请重试');
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'all') return true;
    return task.status === activeFilter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    } else if (sortBy === 'created') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  const groupedByDate = sortedTasks.reduce((acc, task) => {
    const date = task.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const groupedByStatus = sortedTasks.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const groupedByPriority = sortedTasks.reduce((acc, task) => {
    const priority = task.priority;
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(task);
    return acc;
  }, {} as Record<TaskPriority, Task[]>);

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
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

        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-light">加载中...</p>
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
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extralight text-white mb-2">任务管理</h1>
            <p className="text-white/80 font-light text-lg">管理你的日常待办事项</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3.5 bg-white/95 text-emerald-700 rounded-full font-medium hover:bg-white hover:shadow-lg hover:scale-105 transition-all text-sm"
          >
            + 新建任务
          </button>
        </div>

        {/* 筛选和视图切换 */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          {/* 状态筛选 */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                activeFilter === 'all'
                  ? 'bg-white/95 text-emerald-700 shadow-md'
                  : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
              }`}
            >
              全部 ({tasks.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                activeFilter === 'pending'
                  ? 'bg-white/95 text-orange-700 shadow-md'
                  : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
              }`}
            >
              未开始 ({tasks.filter(t => t.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                activeFilter === 'in_progress'
                  ? 'bg-white/95 text-blue-700 shadow-md'
                  : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
              }`}
            >
              进行中 ({tasks.filter(t => t.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                activeFilter === 'completed'
                  ? 'bg-white/95 text-teal-700 shadow-md'
                  : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
              }`}
            >
              已完成 ({tasks.filter(t => t.status === 'completed').length})
            </button>
          </div>

          {/* 视图和排序控制 */}
          <div className="flex items-center gap-3">
            {/* 排序选择 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
            >
              <option value="date">按日期排序</option>
              <option value="priority">按优先级排序</option>
              <option value="created">按创建时间排序</option>
            </select>

            {/* 视图切换 */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-1">
              <button
                onClick={() => setViewMode('date')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'date'
                    ? 'bg-white/95 text-emerald-700'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                📅 日期
              </button>
              <button
                onClick={() => setViewMode('status')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'status'
                    ? 'bg-white/95 text-emerald-700'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                📊 状态
              </button>
              <button
                onClick={() => setViewMode('priority')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'priority'
                    ? 'bg-white/95 text-emerald-700'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                🏷️ 优先级
              </button>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        {filteredTasks.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/50 p-16 text-center shadow-xl">
            <div className="w-24 h-24 rounded-3xl bg-emerald-100 shadow-lg flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">📝</span>
            </div>
            <h3 className="text-2xl font-light text-gray-900 mb-3">还没有任务</h3>
            <p className="text-gray-600 font-light mb-8 max-w-md mx-auto">
              创建你的第一个任务，开始高效管理时间
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              创建任务
            </button>
          </div>
        ) : viewMode === 'date' ? (
          <div className="space-y-8">
            {Object.entries(groupedByDate)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, dateTasks]) => {
                const taskDate = new Date(date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isToday = taskDate.toDateString() === today.toDateString();
                const isPast = taskDate < today;

                return (
                  <div key={date} className="group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-1 h-8 bg-gradient-to-b from-white/80 to-white/60 rounded-full"></div>
                      <h3 className="text-lg font-medium text-white">
                        {new Date(date).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long',
                        })}
                      </h3>
                      {isToday && (
                        <span className="px-3 py-1 bg-white/95 text-emerald-700 rounded-full text-xs font-medium shadow-md">
                          今天
                        </span>
                      )}
                      {isPast && !isToday && (
                        <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs font-medium shadow-sm">
                          过去
                        </span>
                      )}
                      <span className="text-sm text-white/80 font-light">
                        {dateTasks.length} 个任务
                      </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {dateTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleStatusChange}
                          onEdit={setEditingTask}
                          onDelete={handleDeleteTask}
                          onStartPomodoro={setPomodoroTask}
                          onDuplicate={handleDuplicateTask}
                          isSelected={selectedTasks.includes(task.id)}
                          onSelect={toggleTaskSelection}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : viewMode === 'status' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['pending', 'in_progress', 'completed'] as TaskStatus[]).map((status) => {
              const statusTasks = groupedByStatus[status] || [];
              const statusConfig = {
                pending: {
                  label: '未开始',
                  color: 'orange',
                  icon: '📋',
                  gradient: 'from-slate-500 to-gray-600',
                  bgGradient: 'from-white/90 to-white/80',
                },
                in_progress: {
                  label: '进行中',
                  color: 'blue',
                  icon: '⚡',
                  gradient: 'from-emerald-500 to-teal-600',
                  bgGradient: 'from-white/90 to-white/80',
                },
                completed: {
                  label: '已完成',
                  color: 'green',
                  icon: '✅',
                  gradient: 'from-teal-500 to-green-600',
                  bgGradient: 'from-white/90 to-white/80',
                },
              };

              const config = statusConfig[status];

              return (
                <div key={status} className={`bg-gradient-to-br ${config.bgGradient} backdrop-blur-sm rounded-3xl border border-white/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md`}
                      >
                        <span className="text-2xl">{config.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {config.label}
                        </h3>
                        <p className="text-sm text-gray-500 font-light">{statusTasks.length} 个任务</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {statusTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onEdit={setEditingTask}
                        onDelete={handleDeleteTask}
                        onStartPomodoro={setPomodoroTask}
                        onDuplicate={handleDuplicateTask}
                        isSelected={selectedTasks.includes(task.id)}
                        onSelect={toggleTaskSelection}
                      />
                    ))}
                    {statusTasks.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">暂无任务</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['high', 'medium', 'low'] as TaskPriority[]).map((priority) => {
              const priorityTasks = groupedByPriority[priority] || [];
              const priorityConfig = {
                high: {
                  label: '高优先级',
                  color: 'red',
                  icon: '🔥',
                  gradient: 'from-rose-500 to-pink-600',
                  bgGradient: 'from-white/90 to-white/80',
                },
                medium: {
                  label: '中优先级',
                  color: 'orange',
                  icon: '⭐',
                  gradient: 'from-amber-500 to-yellow-600',
                  bgGradient: 'from-white/90 to-white/80',
                },
                low: {
                  label: '低优先级',
                  color: 'blue',
                  icon: '💧',
                  gradient: 'from-emerald-500 to-teal-600',
                  bgGradient: 'from-white/90 to-white/80',
                },
              };

              const config = priorityConfig[priority];

              return (
                <div key={priority} className={`bg-gradient-to-br ${config.bgGradient} backdrop-blur-sm rounded-3xl border border-white/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md`}
                      >
                        <span className="text-2xl">{config.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {config.label}
                        </h3>
                        <p className="text-sm text-gray-500 font-light">{priorityTasks.length} 个任务</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {priorityTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onEdit={setEditingTask}
                        onDelete={handleDeleteTask}
                        onStartPomodoro={setPomodoroTask}
                        onDuplicate={handleDuplicateTask}
                        isSelected={selectedTasks.includes(task.id)}
                        onSelect={toggleTaskSelection}
                      />
                    ))}
                    {priorityTasks.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">暂无任务</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 任务表单模态框 */}
      {(showCreateModal || editingTask) && (
        <TaskForm
          task={editingTask || undefined}
          onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* 番茄钟模态框 */}
      {pomodoroTask && (
        <PomodoroModal task={pomodoroTask} onClose={() => setPomodoroTask(null)} />
      )}

      {/* 批量操作 */}
      <BatchActions
        selectedTasks={selectedTasks}
        tasks={tasks}
        onBatchDelete={handleBatchDelete}
        onBatchMove={handleBatchMove}
        onBatchStatusChange={handleBatchStatusChange}
        onClearSelection={() => setSelectedTasks([])}
      />
    </div>
  );
}
