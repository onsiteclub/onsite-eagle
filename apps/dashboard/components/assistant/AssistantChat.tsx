'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, X, Sparkles } from 'lucide-react'
import AssistantMessage from './AssistantMessage'
import { getSuggestedQuestions } from '@/lib/assistant/prompts'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AssistantChatProps {
  currentPage: string
  onClose: () => void
}

export default function AssistantChat({ currentPage, onClose }: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestedQuestions = getSuggestedQuestions(currentPage)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function sendMessage(messageText?: string) {
    const text = messageText || input.trim()
    if (!text || loading) return

    setError(null)
    setInput('')

    // Add user message
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentPage,
          conversationHistory: messages,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add assistant message
      const assistantMessage: Message = { role: 'assistant', content: data.message }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      console.error('Chat error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-brand-500 text-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">OnSite Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-brand-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Hi! How can I help?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Ask me anything about OnSite Club
            </p>

            {/* Suggested questions */}
            <div className="space-y-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(question)}
                  disabled={loading}
                  className="block w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <AssistantMessage
                key={index}
                role={message.role}
                content={message.content}
              />
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t bg-gray-50 rounded-b-xl">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
