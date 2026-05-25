'use client'

import { useState } from 'react'
import { sendPartnerInvitation } from '@/lib/services/partnerService'
import { Heart, Mail, Send } from 'lucide-react'
import { InvitationManager } from './InvitationManager'
import { ConnectionStatus } from './ConnectionStatus'

export function PartnerInvitation() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }

    setLoading(true)
    setError('')

    const result = await sendPartnerInvitation(email)

    if (result) {
      setSuccess(true)
      setEmail('')
      // 刷新页面以更新邀请列表
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } else {
      setError('发送邀请失败，请稍后重试')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 主邀请卡片 */}
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
          <Heart className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold mb-4">伴侣空间</h1>
        <p className="text-gray-600 mb-8">
          邀请你的伴侣一起规划，互相鼓励，共同成长
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-green-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">邀请已发送！</h3>
            <p className="text-green-700">
              我们已经向 {email} 发送了邀请，等待对方接受后即可开始使用伴侣空间功能。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入伴侣的邮箱地址"
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !email.trim()}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                发送邀请
              </button>
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-semibold text-blue-900 mb-2">功能介绍：</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 查看伴侣的今日任务、习惯打卡和项目进度</li>
                <li>• 给伴侣的任务和打卡点赞鼓励</li>
                <li>• 双人留言板，随时交流和支持</li>
                <li>• 创建共同目标，一起完成挑战</li>
                <li>• 完善的隐私保护，只能看到共享的内容</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 两列布局：邀请管理和连接状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InvitationManager />
        </div>
        <div className="lg:col-span-1">
          <ConnectionStatus />
        </div>
      </div>
    </div>
  )
}
