'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { DashboardNav } from './partner/components/DashboardNav';

const DesktopPet = dynamic(
  () => import('./partner/components/DesktopPet').then((mod) => mod.DesktopPet),
  { ssr: false, loading: () => null }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase]);

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

      {/* 统一导航栏 */}
      <DashboardNav />

      {children}

      <DesktopPet />
    </div>
  );
}
