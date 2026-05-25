'use client'

import { useState, useEffect, useRef } from 'react'
import { getUserProfile, updateUserProfile, uploadAvatar, type UserProfile } from '@/lib/services/userService'
import { X, Upload, User, Calendar, Camera } from 'lucide-react'

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function UserSettingsModal({ isOpen, onClose, onUpdate }: UserSettingsModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [username, setUsername] = useState('')
  const [birthday, setBirthday] = useState('')
  const [avatar, setAvatar] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  const loadProfile = async () => {
    const data = await getUserProfile()
    if (data) {
      setProfile(data)
      setUsername(data.username || '')
      setBirthday(data.birthday || '')
      setAvatar(data.avatar || '')
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    // 验证文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB')
      return
    }

    setUploading(true)
    const url = await uploadAvatar(file)
    if (url) {
      setAvatar(url)
    } else {
      alert('上传头像失败，请重试')
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!username.trim()) {
      alert('请输入昵称')
      return
    }

    setLoading(true)
    const success = await updateUserProfile({
      username: username.trim(),
      avatar: avatar || undefined,
      birthday: birthday || undefined
    })

    if (success) {
      onUpdate()
      onClose()
    } else {
      alert('保存失败，请重试')
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-semibold text-gray-900">个人设置</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 头像 */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="头像"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>

              {/* 上传按钮 */}
              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <p className="mt-3 text-sm text-gray-500">点击头像上传新图片</p>
            <p className="text-xs text-gray-400">支持 JPG、PNG，最大 2MB</p>
          </div>

          {/* 昵称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              昵称
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入昵称"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              maxLength={20}
            />
            <p className="mt-1 text-xs text-gray-500">{username.length}/20</p>
          </div>

          {/* 生日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              生日
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* 账号信息 */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">账号信息</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">邮箱：</span>
                {profile?.email}
              </p>
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">等级：</span>
                Lv.{profile?.level || 1}
              </p>
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">经验：</span>
                {profile?.exp || 0}
              </p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading || uploading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
