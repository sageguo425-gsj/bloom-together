'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Project, ProjectJournal, Task } from '@/lib/types/database';

export default function ProjectDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [journals, setJournals] = useState<ProjectJournal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const projectId = params.id as string;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      loadProject();
      loadJournals();
      loadTasks();
    };

    getUser();
  }, [projectId]);

  useEffect(() => {
    // 检查URL参数，如果有edit=true则打开编辑模态框
    if (searchParams.get('edit') === 'true' && project) {
      setShowEditModal(true);
    }
  }, [searchParams, project]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('加载项目失败:', error);
      router.push('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const loadJournals = async () => {
    try {
      const { data, error } = await supabase
        .from('project_journals')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (error) {
      console.error('加载日记失败:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个项目吗？此操作无法撤销。')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      router.push('/dashboard/projects');
    } catch (error) {
      console.error('删除项目失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

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

  if (!project) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'in_progress': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

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
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center text-white/90 hover:text-white mb-6 font-light transition-colors"
        >
          ← 返回项目列表
        </Link>

        {/* Project Header - 精简版 */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-300 p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <h1 className="text-4xl font-extralight text-gray-900">{project.title}</h1>
              <span className={`px-4 py-1.5 text-sm rounded-full border font-medium ${getStatusColor(project.status)}`}>
                {project.status === 'pending' ? '未开始' : project.status === 'in_progress' ? '进行中' : project.status === 'completed' ? '已完成' : project.status}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-5 py-2.5 text-gray-700 bg-white border border-emerald-200 rounded-full hover:bg-emerald-50 transition-all text-sm font-medium"
              >
                编辑
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2.5 text-red-600 bg-white border border-red-300 rounded-full hover:bg-red-50 transition-all text-sm font-medium"
              >
                删除
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/60 rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">开始日期</p>
              <p className="text-base font-medium text-gray-900">{new Date(project.start_date).toLocaleDateString()}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">截止日期</p>
              <p className="text-base font-medium text-gray-900">{new Date(project.end_date).toLocaleDateString()}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">优先级</p>
              <p className={`text-base font-medium ${getPriorityColor(project.priority)}`}>
                {project.priority === 'high' ? '高' : project.priority === 'medium' ? '中' : '低'}
              </p>
            </div>
          </div>
        </div>

        {/* 两栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左栏：任务列表 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-gray-900">项目任务</h2>
              <button
                onClick={() => setShowTaskModal(true)}
                className="px-4 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all text-sm font-medium shadow-sm hover:shadow-md"
              >
                + 添加任务
              </button>
            </div>

            {/* 任务列表 */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-12 bg-white/60 rounded-xl">
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📝</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">暂无任务</p>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    添加第一个任务
                  </button>
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onUpdate={loadTasks}
                    onEdit={setEditingTask}
                  />
                ))
              )}
            </div>
          </div>

          {/* 右栏：项目日记 */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-200 p-6 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-gray-900">项目日记</h2>
              <button
                onClick={() => setShowJournalModal(true)}
                className="px-4 py-2.5 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-all text-sm font-medium shadow-sm hover:shadow-md"
              >
                + 添加日记
              </button>
            </div>

            {/* 日记列表 */}
            {journals.length === 0 ? (
              <div className="text-center py-12 bg-white/60 rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📔</span>
                </div>
                <p className="text-gray-500 text-sm mb-3">还没有日记记录</p>
                <button
                  onClick={() => setShowJournalModal(true)}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  添加第一条日记
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {journals.map((journal) => (
                  <JournalItem
                    key={journal.id}
                    journal={journal}
                    onUpdate={loadJournals}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadProject();
          }}
        />
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <AddJournalModal
          projectId={projectId}
          onClose={() => setShowJournalModal(false)}
          onSuccess={() => {
            setShowJournalModal(false);
            loadJournals();
          }}
        />
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <AddTaskModal
          projectId={projectId}
          userId={user?.id || ''}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            setShowTaskModal(false);
            loadTasks();
          }}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={() => {
            setEditingTask(null);
            loadTasks();
          }}
        />
      )}
    </div>
  );
}

// Task Item Component
function TaskItem({ task, onUpdate, onEdit }: { task: Task; onUpdate: () => void; onEdit: (task: Task) => void }) {
  const [isCompleted, setIsCompleted] = useState(task.status === 'completed');
  const supabase = createClient();

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    try {
      const newStatus = isCompleted ? 'pending' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;
      setIsCompleted(!isCompleted);
      onUpdate();
    } catch (error) {
      console.error('更新任务失败:', error);
      alert('更新失败，请重试');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除失败，请重试');
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'completed': return 'text-blue-600';
      case 'in_progress': return 'text-emerald-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = () => {
    switch (task.status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      default: return '未开始';
    }
  };

  return (
    <div
      onClick={() => onEdit(task)}
      className="flex items-start gap-3 p-4 bg-white/80 rounded-xl hover:bg-white transition-all border border-blue-100 group cursor-pointer"
    >
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={handleToggleComplete}
        onClick={handleToggleComplete}
        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <div className="flex-1">
        <p className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-500 mt-1">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs ${getStatusColor()}`}>{getStatusLabel()}</span>
          {task.date && (
            <span className="text-xs text-gray-500">截止：{new Date(task.date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-600 hover:text-red-700 font-medium"
      >
        删除
      </button>
    </div>
  );
}

// Journal Item Component
function JournalItem({ journal, onUpdate }: { journal: ProjectJournal; onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(journal.content);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_journals')
        .update({ content: editContent })
        .eq('id', journal.id);

      if (error) throw error;
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('更新日记失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条日记吗？')) return;

    try {
      const { error } = await supabase
        .from('project_journals')
        .delete()
        .eq('id', journal.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('删除日记失败:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className="bg-white/80 rounded-xl p-4 border-l-4 border-teal-500 group hover:bg-white transition-all">
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs text-gray-500">
          {new Date(journal.created_at).toLocaleString()}
        </p>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                编辑
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                删除
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="px-3 py-1.5 bg-teal-500 text-white text-xs rounded-full hover:bg-teal-600 disabled:opacity-50 font-medium"
            >
              {loading ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(journal.content);
              }}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-full hover:bg-gray-50 font-medium"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{journal.content}</p>
      )}
    </div>
  );
}

// Edit Project Modal
function EditProjectModal({ project, onClose, onSuccess }: { project: Project; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [startDate, setStartDate] = useState(project.start_date);
  const [endDate, setEndDate] = useState(project.end_date);
  const [totalTasks, setTotalTasks] = useState(project.total_tasks || 0);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(project.priority);
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(project.status);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title,
          description,
          start_date: startDate,
          end_date: endDate,
          total_tasks: totalTasks,
          priority,
          status,
        })
        .eq('id', project.id);

      if (error) throw error;

      // 清除URL中的edit参数
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());

      onSuccess();
    } catch (error) {
      console.error('更新项目失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100/50">
        <div className="p-8 border-b border-emerald-100/50">
          <h2 className="text-3xl font-extralight text-gray-900">编辑项目</h2>
          <p className="text-gray-600 font-light text-sm mt-2">更新项目信息</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">截止日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">总任务量</label>
            <input
              type="number"
              value={totalTasks}
              onChange={(e) => setTotalTasks(Number(e.target.value))}
              min="0"
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              placeholder="例如：15（用于跟踪项目进度）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">状态</label>
            <div className="flex gap-3">
              {[
                { value: 'pending', label: '未开始', color: 'orange' },
                { value: 'in_progress', label: '进行中', color: 'emerald' },
                { value: 'completed', label: '已完成', color: 'blue' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value as any)}
                  className={`flex-1 px-4 py-3.5 rounded-2xl border-2 transition-all font-light ${
                    status === option.value
                      ? option.color === 'orange'
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : option.color === 'emerald'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">优先级</label>
            <div className="flex gap-3">
              {[
                { value: 'high', label: '高', color: 'red' },
                { value: 'medium', label: '中', color: 'emerald' },
                { value: 'low', label: '低', color: 'gray' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value as any)}
                  className={`flex-1 px-4 py-3.5 rounded-2xl border-2 transition-all font-light ${
                    priority === option.value
                      ? option.value === 'high'
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : option.value === 'medium'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-gray-400 bg-gray-50 text-gray-700'
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  {option.label}优先级
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Journal Modal
function AddJournalModal({ projectId, onClose, onSuccess }: { projectId: string; onClose: () => void; onSuccess: () => void }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('project_journals')
        .insert({
          project_id: parseInt(projectId),
          content,
        });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('添加日记失败:', error);
      alert('添加失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-teal-100/50">
        <div className="p-8 border-b border-teal-100/50">
          <h2 className="text-3xl font-extralight text-gray-900">添加项目日记</h2>
          <p className="text-gray-600 font-light text-sm mt-2">记录项目进展和想法</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">日记内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={6}
              className="w-full px-4 py-3.5 bg-white border border-teal-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all font-light resize-none"
              placeholder="记录今天的项目进展..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '添加中...' : '添加日记'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Task Modal
function AddTaskModal({ projectId, userId, onClose, onSuccess }: { projectId: string; userId: string; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          project_id: parseInt(projectId),
          title,
          description,
          date,
          start_time: startTime || null,
          end_time: endTime || null,
          priority,
          status: 'pending',
          is_shared: false,
        });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('添加任务失败:', error);
      alert('添加失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-blue-100/50">
        <div className="p-8 border-b border-blue-100/50">
          <h2 className="text-3xl font-extralight text-gray-900">添加项目任务</h2>
          <p className="text-gray-600 font-light text-sm mt-2">为项目添加新任务</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">任务标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light"
              placeholder="例如：完成需求文档"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">任务描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light resize-none"
              placeholder="描述任务的详细内容..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">截止日期 *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">优先级</label>
            <div className="flex gap-3">
              {[
                { value: 'high', label: '高', color: 'red' },
                { value: 'medium', label: '中', color: 'blue' },
                { value: 'low', label: '低', color: 'gray' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value as any)}
                  className={`flex-1 px-4 py-3.5 rounded-2xl border-2 transition-all font-light ${
                    priority === option.value
                      ? option.value === 'high'
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : option.value === 'medium'
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-400 bg-gray-50 text-gray-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {option.label}优先级
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '添加中...' : '添加任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Task Modal
function EditTaskModal({ task, onClose, onSuccess }: { task: Task; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [date, setDate] = useState(task.date);
  const [startTime, setStartTime] = useState(task.start_time || '');
  const [endTime, setEndTime] = useState(task.end_time || '');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(task.priority);
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(task.status);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title,
          description,
          date,
          start_time: startTime || null,
          end_time: endTime || null,
          priority,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', task.id);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('更新任务失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-blue-100/50">
        <div className="p-8 border-b border-blue-100/50">
          <h2 className="text-3xl font-extralight text-gray-900">编辑任务</h2>
          <p className="text-gray-600 font-light text-sm mt-2">修改任务信息</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">任务标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">任务描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">截止日期 *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-blue-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-light"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">状态</label>
            <div className="flex gap-3">
              {[
                { value: 'pending', label: '未开始', color: 'orange' },
                { value: 'in_progress', label: '进行中', color: 'emerald' },
                { value: 'completed', label: '已完成', color: 'blue' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value as any)}
                  className={`flex-1 px-4 py-3.5 rounded-2xl border-2 transition-all font-light ${
                    status === option.value
                      ? option.color === 'orange'
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : option.color === 'emerald'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">优先级</label>
            <div className="flex gap-3">
              {[
                { value: 'high', label: '高', color: 'red' },
                { value: 'medium', label: '中', color: 'blue' },
                { value: 'low', label: '低', color: 'gray' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value as any)}
                  className={`flex-1 px-4 py-3.5 rounded-2xl border-2 transition-all font-light ${
                    priority === option.value
                      ? option.value === 'high'
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : option.value === 'medium'
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-400 bg-gray-50 text-gray-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {option.label}优先级
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
