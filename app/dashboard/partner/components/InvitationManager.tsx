'use client'

import { useState, useEffect } from 'react'
import {
  getSentInvitations,
  getReceivedInvitations,
  acceptPartnerInvitation,
  rejectPartnerInvitation,
  cancelPartnerInvitation,
  type PartnerInvitation
} from '@/lib/services/partnerService'
import { Check, X, Clock, Mail, UserCheck, UserX } from 'lucide-react'

export function InvitationManager() {
  const [sentInvitations, setSentInvitations] = useState<PartnerInvitation[]>([])
  const [receivedInvitations, setReceivedInvitations] = useState<PartnerInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    loadInvitations()
  }, [])

  const loadInvitations = async () => {
    setLoading(true)
    const [sent, received] = await Promise.all([
      getSentInvitations(),
      getReceivedInvitations()
    ])
    setSentInvitations(sent)
    setReceivedInvitations(received)
    setLoading(false)
  }

  const handleAccept = async (invitationId: number) => {
    setActionLoading(invitationId)
    const success = await acceptPartnerInvitation(invitationId)
    if (success) {
      // 刷新页面以显示伴侣空间
      window.location.reload()
    } else {
      alert('接受邀请失败，请稍后重试')
    }
    setActionLoading(null)
  }

  const handleReject = async (invitationId: number) => {
    setActionLoading(invitationId)
    const success = await rejectPartnerInvitation(invitationId)
    if (success) {
      await loadInvitations()
    } else {
      alert('拒绝邀请失败，请稍后重试')
    }
    setActionLoading(null)
  }

  const handleCancel = async (invitationId: number) => {
    setActionLoading(invitationId)
    const success = await cancelPartnerInvitation(invitationId)
    if (success) {
      await loadInvitations()
    } else {
      alert('取消邀请失败，请稍后重试')
    }
    setActionLoading(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            等待中
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <UserCheck className="w-3 h-3" />
            已接受
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            <UserX className="w-3 h-3" />
            已拒绝
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            <X className="w-3 h-3" />
            已取消
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
      </div>
    )
  }

  const pendingReceived = receivedInvitations.filter(inv => inv.status === 'pending')
  const pendingSent = sentInvitations.filter(inv => inv.status === 'pending')

  return (
    <div className="space-y-6">
      {/* 收到的邀请 */}
      {receivedInvitations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            收到的邀请
            {pendingReceived.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingReceived.length}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {receivedInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {invitation.sender?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {invitation.sender?.username || '未知用户'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invitation.sender?.email || invitation.receiver_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{new Date(invitation.created_at).toLocaleDateString('zh-CN')}</span>
                    {getStatusBadge(invitation.status)}
                  </div>
                </div>
                {invitation.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleAccept(invitation.id)}
                      disabled={actionLoading === invitation.id}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      接受
                    </button>
                    <button
                      onClick={() => handleReject(invitation.id)}
                      disabled={actionLoading === invitation.id}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-sm"
                    >
                      <X className="w-4 h-4" />
                      拒绝
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 发送的邀请 */}
      {sentInvitations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            发送的邀请
          </h3>
          <div className="space-y-3">
            {sentInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">
                    {invitation.receiver_email}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{new Date(invitation.created_at).toLocaleDateString('zh-CN')}</span>
                    {getStatusBadge(invitation.status)}
                  </div>
                </div>
                {invitation.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(invitation.id)}
                    disabled={actionLoading === invitation.id}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-sm"
                  >
                    <X className="w-4 h-4" />
                    取消
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {receivedInvitations.length === 0 && sentInvitations.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">暂无邀请记录</p>
        </div>
      )}
    </div>
  )
}
