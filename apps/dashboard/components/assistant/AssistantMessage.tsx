'use client'

import { Bot, User } from 'lucide-react'

interface AssistantMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export default function AssistantMessage({ role, content }: AssistantMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-gray-200' : 'bg-brand-500'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-600" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isUser
            ? 'bg-brand-500 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-800 rounded-tl-sm'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
