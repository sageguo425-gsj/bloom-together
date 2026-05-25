'use client'

import { useState, useEffect, useRef } from 'react'
import { Message, getMessages, sendMessage, markMessagesAsRead } from '@/lib/services/partnerService'
import { MessageCircle, Send, Smile } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const EMOJI_LIST = [
  '❤️', '💕', '💖', '💗', '💓', '💝',
  '😊', '😄', '😁', '🥰', '😍', '🤗',
  '👍', '👏', '🙌', '💪', '✨', '⭐',
  '🎉', '🎊', '🎈', '🎁', '🔥', '💯',
  '🌟', '🌈', '🌸', '🌺', '🌻', '🌷',
  '☕', '🍰', '🍕', '🍔', '🎂', '🍓',
  '😂', '🤣', '😅', '😆', '😉', '😌',
  '🤔', '🤨', '😮', '😲', '🥺', '😢'
]

export function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState<string>()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    markMessagesAsRead()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const loadMessages = async () => {
    const data = await getMessages()
    setMessages(data)
  }

  const handleSend = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!newMessage.trim() && !selectedEmoji) return

    setLoading(true)
    try {
      const success = await sendMessage(newMessage.trim() || '👋', selectedEmoji)
      if (success) {
        setNewMessage('')
        setSelectedEmoji(undefined)
        await loadMessages()
      } else {
        console.error('发送留言失败')
      }
    } catch (error) {
      console.error('发送留言出错:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return format(date, 'HH:mm', { locale: zhCN })
    } else if (diffInDays === 1) {
      return '昨天 ' + format(date, 'HH:mm', { locale: zhCN })
    } else if (diffInDays < 7) {
      return format(date, 'EEEE HH:mm', { locale: zhCN })
    } else {
      return format(date, 'MM-dd HH:mm', { locale: zhCN })
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-emerald-600" />
        <h2 className="text-xl font-bold text-gray-900">留言板</h2>
      </div>

      {/* 消息列表 */}
      <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">还没有留言，快来发送第一条吧！</p>
        ) : (
          <>
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === message.receiver_id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    message.sender_id === message.receiver_id
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  {message.emoji && (
                    <span className="text-2xl mb-1 block">{message.emoji}</span>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-1.5 ${
                    message.sender_id === message.receiver_id ? 'text-emerald-100' : 'text-gray-400'
                  }`}>
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入框 */}
      <div className="space-y-2">
        {selectedEmoji && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 px-3 py-2 rounded-lg">
            <span className="text-gray-600">已选表情：</span>
            <span className="text-2xl">{selectedEmoji}</span>
            <button
              onClick={() => setSelectedEmoji(undefined)}
              className="ml-auto text-red-500 hover:text-red-700 font-medium"
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="relative" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
              type="button"
            >
              <Smile className="w-5 h-5 text-gray-600" />
            </button>

            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 w-80">
                <div className="text-sm font-medium text-gray-700 mb-3">选择表情</div>
                <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {EMOJI_LIST.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setSelectedEmoji(emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="text-2xl hover:bg-gray-100 rounded-lg p-2 transition-colors"
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入留言..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedEmoji) || loading}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex-shrink-0"
            type="button"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
