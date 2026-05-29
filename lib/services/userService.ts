import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  username: string
  email: string
  avatar?: string
  birthday?: string
  level: number
  exp: number
  exp_spent?: number
  partner_id?: string
}

// 获取当前用户资料
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('获取用户资料失败:', error)
    return null
  }

  return data
}

// 更新用户资料
export async function updateUserProfile(updates: {
  username?: string
  avatar?: string
  birthday?: string
}): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    console.error('更新用户资料失败:', error.message, error.details, error.hint)
    return false
  }

  return true
}

// 上传头像
export async function uploadAvatar(file: File): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // 生成唯一文件名
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${user.id}/${fileName}`

  // 上传到 Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('user-uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) {
    console.error('上传头像失败:', uploadError)
    return null
  }

  // 获取公开 URL
  const { data } = supabase.storage
    .from('user-uploads')
    .getPublicUrl(filePath)

  return data.publicUrl
}
