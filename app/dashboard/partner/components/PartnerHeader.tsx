'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PartnerProfile } from '@/lib/services/partnerService'

interface PartnerHeaderProps {
  partner: PartnerProfile
}

export function PartnerHeader({ partner }: PartnerHeaderProps) {
  const [currentUserName, setCurrentUserName] = useState<string>('我')
  const supabase = createClient()

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // 尝试从 users 表获取用户名
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()

        setCurrentUserName(userData?.username || user.user_metadata?.username || '我')
      }
    }
    loadCurrentUser()
  }, [supabase])

  return (
    <div className="flex flex-col items-center">
      {/* 用户名 + 爱心 + 伴侣名 */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <h1 className="text-4xl font-bold text-emerald-900 tracking-wide">
          {currentUserName}
        </h1>
        <span className="text-4xl animate-pulse">❤️</span>
        <h1 className="text-4xl font-bold text-emerald-900 tracking-wide">
          {partner.username}
        </h1>
      </div>

      {/* For you, a thousand times over */}
      <p className="text-emerald-800 italic text-xl font-medium">
        For you, a thousand times over
      </p>
    </div>
  )
}
