'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { getUserProfile, type UserProfile } from '@/lib/services/userService'
import { UserSettingsModal } from '@/components/UserSettingsModal'
import { Settings, LogOut, User as UserIcon, Menu, X } from 'lucide-react'
import { getLevelProgress, getLevelTitle } from '@/lib/utils/levelSystem'

export function DashboardNav() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // 自动检测当前页面
  const getCurrentPage = (): 'home' | 'tasks' | 'pomodoro' | 'projects' | 'habits' | 'partner' => {
    if (pathname === '/dashboard') return 'home'
    if (pathname?.startsWith('/dashboard/tasks')) return 'tasks'
    if (pathname?.startsWith('/dashboard/pomodoro')) return 'pomodoro'
    if (pathname?.startsWith('/dashboard/projects')) return 'projects'
    if (pathname?.startsWith('/dashboard/habits')) return 'habits'
    if (pathname?.startsWith('/dashboard/partner')) return 'partner'
    return 'home'
  }

  const currentPage = getCurrentPage()

  useEffect(() => {
    loadUserData()
  }, [supabase])

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const profileData = await getUserProfile()
      setProfile(profileData)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleUpdateProfile = () => {
    loadUserData()
  }

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/20">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/60 via-teal-800/50 to-green-900/60"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-12">
              <Link href="/dashboard" className="text-2xl font-extralight tracking-tight text-white">
                Bloom <span className="font-light">Together</span>
              </Link>
              <nav className="hidden md:flex space-x-1">
                <Link
                  href="/dashboard"
                  className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                    currentPage === 'home'
                      ? 'text-white bg-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  首页
                </Link>
                <Link
                  href="/dashboard/projects"
                  className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                    currentPage === 'projects'
                      ? 'text-white bg-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  项目
                </Link>
                <Link
                  href="/dashboard/tasks"
                  className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                    currentPage === 'tasks'
                      ? 'text-white bg-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  任务
                </Link>
                <Link
                  href="/dashboard/habits"
                  className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                    currentPage === 'habits'
                      ? 'text-white bg-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  习惯
                </Link>
                <Link
                  href="/dashboard/pomodoro"
                  className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                    currentPage === 'pomodoro'
                      ? 'text-white bg-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  番茄钟
                </Link>
                <Link
                  href="/dashboard/partner"
                  className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                    currentPage === 'partner'
                      ? 'text-white bg-white/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  伴侣空间
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Menu className="w-6 h-6 text-white" />
                )}
              </button>

              {/* 用户信息下拉菜单 */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-white/10 transition-all"
                >
                  {/* 头像 */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center border-2 border-white/20">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* 用户名 */}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white">
                      {profile?.username || user?.user_metadata?.username || '用户'}
                    </p>
                    <p className="text-xs text-white/60">
                      Lv.{profile?.level || 1}
                    </p>
                  </div>

                  {/* 下拉箭头 */}
                  <svg
                    className={`w-4 h-4 text-white/80 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 下拉菜单 */}
                {showDropdown && (
                  <>
                    {/* 点击外部关闭 */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDropdown(false)}
                    />

                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                      {/* 用户信息 */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.username || user?.user_metadata?.username || '用户'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {user?.email}
                        </p>

                        {/* 等级和经验 */}
                        {profile && (
                          <div className="mt-3 space-y-2">
                            {/* 等级称号 */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">
                                {getLevelTitle(profile.level || 1).emoji} {getLevelTitle(profile.level || 1).title}
                              </span>
                              <span className="text-sm font-semibold text-emerald-600">
                                Lv.{profile.level || 1}
                              </span>
                            </div>

                            {/* 经验条 */}
                            {(() => {
                              const progress = getLevelProgress(profile.exp || 0);
                              return (
                                <>
                                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                                      style={{ width: `${progress.progress}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 text-center">
                                    {progress.expInCurrentLevel} / {progress.expNeededForNextLevel} EXP
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* 菜单项 */}
                      <button
                        onClick={() => {
                          setShowDropdown(false)
                          setShowSettings(true)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        个人设置
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 移动端导航菜单 */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-white/20 relative z-50">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/95 via-teal-800/95 to-green-900/95"></div>
            <nav className="relative px-4 py-4 space-y-2">
              <Link
                href="/dashboard"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  currentPage === 'home'
                    ? 'text-white bg-white/20'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                首页
              </Link>
              <Link
                href="/dashboard/projects"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  currentPage === 'projects'
                    ? 'text-white bg-white/20'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                项目
              </Link>
              <Link
                href="/dashboard/tasks"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  currentPage === 'tasks'
                    ? 'text-white bg-white/20'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                任务
              </Link>
              <Link
                href="/dashboard/habits"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  currentPage === 'habits'
                    ? 'text-white bg-white/20'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                习惯
              </Link>
              <Link
                href="/dashboard/pomodoro"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  currentPage === 'pomodoro'
                    ? 'text-white bg-white/20'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                番茄钟
              </Link>
              <Link
                href="/dashboard/partner"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  currentPage === 'partner'
                    ? 'text-white bg-white/20'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                伴侣空间
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* 用户设置弹窗 */}
      <UserSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onUpdate={handleUpdateProfile}
      />
    </>
  )
}
