'use client'

import { useState, useEffect } from 'react'
import { getPartnerProfile, removePartner, type PartnerProfile } from '@/lib/services/partnerService'
import { Heart, UserMinus, RefreshCw } from 'lucide-react'

export function ConnectionStatus() {
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    loadPartner()
  }, [])

  const loadPartner = async () => {
    setLoading(true)
    const partnerData = await getPartnerProfile()
    setPartner(partnerData)
    setLoading(false)
  }

  const handleRemovePartner = async () => {
    if (!confirm('确定要解除伴侣关系吗？此操作不可撤销。')) {
      return
    }

    setRemoving(true)
    const success = await removePartner()
    if (success) {
      window.location.reload()
    } else {
      alert('解除关系失败，请稍后重试')
      setRemoving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-gray-400" />
          连接状态
        </h3>
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">未连接伴侣</p>
          <p className="text-gray-400 text-xs mt-1">发送邀请或接受邀请后即可连接</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-pink-500" />
        连接状态
      </h3>

      <div className="space-y-4">
        {/* 伴侣信息卡片 */}
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              {partner.avatar ? (
                <img
                  src={partner.avatar}
                  alt={partner.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                  {partner.username[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{partner.username}</p>
              <p className="text-xs text-gray-500">{partner.email}</p>
            </div>
          </div>

          {/* 等级和经验 */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-600">等级</span>
              <span className="font-semibold text-purple-600">Lv.{partner.level}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600">经验</span>
              <span className="font-semibold text-purple-600">{partner.exp}</span>
            </div>
          </div>
        </div>

        {/* 连接状态指示 */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-800">已连接</span>
          </div>
          <button
            onClick={loadPartner}
            className="p-1 hover:bg-green-100 rounded transition-colors"
            title="刷新状态"
          >
            <RefreshCw className="w-4 h-4 text-green-600" />
          </button>
        </div>

        {/* 解除关系按钮 */}
        <button
          onClick={handleRemovePartner}
          disabled={removing}
          className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm border border-red-200"
        >
          <UserMinus className="w-4 h-4" />
          {removing ? '解除中...' : '解除伴侣关系'}
        </button>
      </div>
    </div>
  )
}
