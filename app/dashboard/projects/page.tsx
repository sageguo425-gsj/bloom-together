'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Project } from '@/lib/types/database';
import Link from 'next/link';

import ProjectCard from './components/ProjectCard';

export default function ProjectsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      console.log('Current user:', user.id);
      setUser(user);
      loadProjects(user.id);
    };

    getUser();
  }, [router, supabase]);

  const loadProjects = async (userId: string) => {
    console.log('Loading projects for user:', userId);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      setProjects(data || []);
    } catch (error: any) {
      console.error('加载项目失败:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-extralight text-white mb-3">项目管理</h1>
            <p className="text-white/80 font-light text-lg">管理你的长期目标，见证每一步成长</p>
          </div>
          <div className="flex items-center justify-start lg:justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3.5 bg-white/95 text-emerald-700 rounded-full font-medium hover:bg-white hover:shadow-lg hover:scale-105 transition-all text-sm"
            >
              + 新建项目
            </button>
          </div>
        </div>

        {/* 分类标签 */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
              activeFilter === 'all'
                ? 'bg-white/95 text-emerald-700 shadow-md'
                : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
              activeFilter === 'pending'
                ? 'bg-white/95 text-orange-700 shadow-md'
                : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
            }`}
          >
            未开始
          </button>
          <button
            onClick={() => setActiveFilter('in_progress')}
            className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
              activeFilter === 'in_progress'
                ? 'bg-white/95 text-emerald-700 shadow-md'
                : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
            }`}
          >
            进行中
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
              activeFilter === 'completed'
                ? 'bg-white/95 text-blue-700 shadow-md'
                : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
            }`}
          >
            已完成
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/50 p-16 text-center shadow-md">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 shadow-sm flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="text-2xl font-light text-gray-900 mb-3">还没有项目</h3>
            <p className="text-gray-600 font-light mb-8 max-w-md mx-auto">创建你的第一个项目，开始规划你的目标吧</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all"
            >
              创建项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects
              .filter(project => {
                if (activeFilter === 'all') return true;
                return project.status === activeFilter;
              })
              .map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={setEditingProject}
                />
              ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            if (user) loadProjects(user.id);
          }}
          userId={user?.id || ''}
        />
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={() => {
            setEditingProject(null);
            if (user) loadProjects(user.id);
          }}
        />
      )}
    </div>
  );
}

// Create Project Modal Component
function CreateProjectModal({ onClose, onSuccess, userId }: { onClose: () => void; onSuccess: () => void; userId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.from('projects').insert({
        user_id: userId,
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        total_tasks: totalTasks,
        priority,
        status: 'pending',
        is_shared: false,
      });

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      setError(error.message || '创建项目失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100/50">
        <div className="p-8 border-b border-emerald-100/50">
          <h2 className="text-3xl font-extralight text-gray-900">创建新项目</h2>
          <p className="text-gray-600 font-light text-sm mt-2">设定你的目标，开始新的旅程</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-light">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目名称 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              placeholder="例如：完成毕业论文"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light resize-none"
              placeholder="描述项目的目标和内容..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始日期 *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                截止日期 *
              </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              总任务量
            </label>
            <input
              type="number"
              value={totalTasks}
              onChange={(e) => setTotalTasks(Number(e.target.value))}
              min="0"
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              placeholder="例如：15（可选，用于跟踪项目进度）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              优先级
            </label>
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
              {loading ? '创建中...' : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Project Modal Component
function EditProjectModal({ project, onClose, onSuccess }: { project: Project; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [startDate, setStartDate] = useState(project.start_date);
  const [endDate, setEndDate] = useState(project.end_date);
  const [totalTasks, setTotalTasks] = useState<number>(project.total_tasks || 0);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(project.priority);
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(project.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.from('projects').update({
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        total_tasks: totalTasks,
        priority,
        status,
      }).eq('id', project.id);

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      setError(error.message || '更新项目失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100/50">
        <div className="p-8 border-b border-emerald-100/50">
          <h2 className="text-3xl font-extralight text-gray-900">编辑项目</h2>
          <p className="text-gray-600 font-light text-sm mt-2">修改项目信息</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-light">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目名称 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始日期 *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                截止日期 *
              </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              总任务量
            </label>
            <input
              type="number"
              value={totalTasks}
              onChange={(e) => setTotalTasks(Number(e.target.value))}
              min="0"
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              状态
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              优先级
            </label>
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
