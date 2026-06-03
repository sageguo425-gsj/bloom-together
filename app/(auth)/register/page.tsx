'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;

      alert('注册成功！请查收邮箱验证邮件。');
      router.push('/login');
    } catch (error: any) {
      setError(error.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* 全屏背景图片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2274)',
          filter: 'brightness(0.75)'
        }}
      />

      {/* 渐变遮罩层 - 治愈绿色系 */}
      <div className="absolute inset-0 bg-gradient-to-bl from-teal-900/70 via-emerald-800/50 to-green-900/60" />

      {/* 装饰性光晕 */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl"></div>

      {/* 居中内容 */}
      <div className="relative z-10 w-full max-w-md">
        {/* 顶部标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl text-white font-extralight tracking-tight mb-3">
            Bloom Together
          </h1>
          <p className="text-emerald-100/70 text-sm italic">&quot;Grow together, bloom together&quot;</p>
        </div>

        {/* 毛玻璃效果注册卡片 */}
        <div className="bg-white/15 backdrop-blur-2xl rounded-3xl p-8 md:p-10 border border-white/30 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-light text-white mb-2">创建账户</h2>
            <p className="text-emerald-100/70 text-sm">开始你的旅程</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-2xl text-red-100 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white/90 mb-2">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                placeholder="你的昵称"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                placeholder="至少 6 位字符"
              />
              <p className="mt-2 text-xs text-white/60">密码至少需要 6 位字符</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white/95 text-emerald-700 py-4 rounded-full font-medium hover:bg-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/20 text-center space-y-4">
            <p className="text-sm text-white/80">
              已有账号？{' '}
              <Link href="/login" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
                立即登录
              </Link>
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white/90 text-sm transition-colors"
            >
              <span>←</span>
              <span>返回首页</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
