import React, { useState, useEffect, useRef } from 'react'
import { TodoItem, Priority, Recurrence, AIPersonality, AISettings } from '../types'
import {
  validateGroqKey,
  magicBreakdownTask,
  kickstartTask,
  triageOverdueTasks,
  SubtaskSuggestion,
  TriageSuggestion,
} from '../utils/groq'
import { animateModalIn } from '../utils/animations'
import { playClickSound, playTaskCompleteSound, playPopSound } from '../utils/sound'
import { getLocalDateString } from '../store'

/* ─── 1. AI Coach Settings Modal ─── */
export function AICoachSettingsModal({
  aiSettings,
  onClose,
  onSave,
}: {
  aiSettings: AISettings
  onClose: () => void
  onSave: (settings: Partial<AISettings>) => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [apiKey, setApiKey] = useState(aiSettings.groqApiKey || '')
  const [personality, setPersonality] = useState<AIPersonality>(aiSettings.personality || 'savage')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)

  useEffect(() => {
    if (modalRef.current) {
      animateModalIn(modalRef.current)
    }
  }, [])

  const handleTestKey = async () => {
    if (!apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    const result = await validateGroqKey(apiKey.trim())
    setTesting(false)
    if (result.success) {
      playTaskCompleteSound()
      setTestResult({
        success: true,
        msg: `✓ Connection successful! Groq API is active${result.activeModel ? ` (${result.activeModel})` : ''}.`,
      })
    } else {
      setTestResult({
        success: false,
        msg: `✗ ${result.error || 'Invalid API key or network error'}`,
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    playClickSound()
    onSave({
      groqApiKey: apiKey.trim(),
      personality,
      enabled: true,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2926]/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-3xl border border-[#E6E0D6] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="font-display text-xl font-bold text-[#2C2926]">
                Groq AI Coach & Settings
              </h2>
              <p className="text-xs text-[#7A746B]">
                Ultra-fast Llama 3.3 powered productivity and tough-love accountability
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="w-8 h-8 rounded-full bg-[#F5F2EC] hover:bg-[#EAE5DC] text-[#6B655B] flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#544F47]">
                Groq API Key *
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#CC8F3F] hover:underline font-medium"
              >
                Get a free key at console.groq.com ↗
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 pr-20 text-sm text-[#2C2926] font-mono focus:outline-none focus:border-[#4F6D52] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#7A746B] hover:text-[#2C2926] px-2 py-1"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[11px] text-[#8F8A80] mt-1.5">
              Your key is saved locally in your browser and your private cloud profile. Never exposed.
            </p>
          </div>

          {/* Test Connection Button */}
          {apiKey.trim() && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testing}
                className="text-xs bg-[#FAF7F2] border border-[#E2DDD5] hover:border-[#4F6D52] text-[#4F6D52] font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {testing ? 'Testing connection...' : '⚡ Test Connection'}
              </button>
              {testResult && (
                <span
                  className={`text-xs font-medium ${
                    testResult.success ? 'text-[#4F6D52]' : 'text-[#B24C38]'
                  }`}
                >
                  {testResult.msg}
                </span>
              )}
            </div>
          )}

          {/* Coach Personality Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#544F47] mb-2">
              Choose Your AI Coach Personality
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'savage',
                  label: 'Savage Roast',
                  icon: '😈',
                  desc: 'Ruthless tough-love. Roasts your excuses and procrastination without filter.',
                  bg: '#FDF2F0',
                  border: '#F2C8C2',
                  activeColor: '#B24C38',
                },
                {
                  id: 'sergeant',
                  label: 'Drill Sergeant',
                  icon: '🪖',
                  desc: 'Demands absolute discipline. No excuses, orders immediate execution.',
                  bg: '#FAF5EB',
                  border: '#EED9C2',
                  activeColor: '#CC8F3F',
                },
                {
                  id: 'mentor',
                  label: 'Wise Mentor',
                  icon: '🧘',
                  desc: 'Direct, thoughtful tough love with clear strategic guidance.',
                  bg: '#EFF6F0',
                  border: '#D2E3D2',
                  activeColor: '#4F6D52',
                },
              ].map((p) => {
                const isSelected = personality === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setPersonality(p.id as AIPersonality)
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 shadow-sm'
                        : 'bg-[#FAF7F2] border-[#E2DDD5] hover:border-[#BDB5A7]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? p.bg : undefined,
                      borderColor: isSelected ? p.activeColor : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-xs font-bold text-[#2C2926]">{p.label}</span>
                    </div>
                    <p className="text-[10px] text-[#6B655B] mt-1.5 leading-relaxed">{p.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE4DC]">
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onClose()
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B655B] hover:bg-[#F2EFEB] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#4F6D52] hover:bg-[#3E5741] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
            >
              Save AI Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── 2. Magic Task Breakdown Modal ─── */
export function MagicBreakdownModal({
  apiKey,
  initialGoal,
  initialCategory = 'Work',
  initialPriority = 'medium',
  baseDeadline,
  onClose,
  onAddSubtasks,
}: {
  apiKey: string
  initialGoal: string
  initialCategory?: string
  initialPriority?: Priority
  baseDeadline: string
  onClose: () => void
  onAddSubtasks: (tasks: SubtaskSuggestion[]) => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [goal, setGoal] = useState(initialGoal)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (modalRef.current) {
      animateModalIn(modalRef.current)
    }
    if (initialGoal.trim() && apiKey.trim()) {
      handleGenerate(initialGoal.trim())
    }
  }, [])

  const handleGenerate = async (targetGoal: string) => {
    if (!targetGoal.trim() || !apiKey.trim()) return
    setLoading(true)
    setError(null)
    try {
      const results = await magicBreakdownTask(
        apiKey,
        targetGoal,
        initialCategory,
        initialPriority,
        baseDeadline
      )
      setSuggestions(results)
      setSelectedIndices(results.map((_, i) => i))
      playTaskCompleteSound()
    } catch (err: any) {
      setError(err.message || 'Failed to deconstruct goal')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSelect = (index: number) => {
    playPopSound()
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const handleConfirm = () => {
    playClickSound()
    const chosen = suggestions.filter((_, i) => selectedIndices.includes(i))
    onAddSubtasks(chosen)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2926]/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-white rounded-3xl border border-[#E6E0D6] shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪄</span>
            <div>
              <h2 className="font-display text-xl font-bold text-[#2C2926]">
                Magic Task Breakdown
              </h2>
              <p className="text-xs text-[#7A746B]">
                Deconstruct a big, overwhelming goal into 3–5 actionable steps
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="w-8 h-8 rounded-full bg-[#F5F2EC] hover:bg-[#EAE5DC] text-[#6B655B] flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Goal Input Bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Build client portfolio website..."
            className="flex-1 bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-sm text-[#2C2926] focus:outline-none focus:border-[#4F6D52] focus:bg-white"
          />
          <button
            type="button"
            onClick={() => handleGenerate(goal)}
            disabled={loading || !goal.trim()}
            className="bg-[#4F6D52] hover:bg-[#3E5741] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            {loading ? 'Deconstructing...' : '✨ Generate'}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-[#FDF2F0] border border-[#F2C8C2] rounded-xl text-xs text-[#B24C38]">
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#4F6D52] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#7A746B]">
              Groq Llama 3.3 is architecting bite-sized sequential subtasks...
            </p>
          </div>
        )}

        {/* Suggestions List */}
        {!loading && suggestions.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#7A746B]">
              <span>Select subtasks to add to your to-do list:</span>
              <span>{selectedIndices.length} of {suggestions.length} selected</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {suggestions.map((item, idx) => {
                const isSelected = selectedIndices.includes(idx)
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleSelect(idx)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#EFF6F0] border-[#4F6D52] shadow-xs'
                        : 'bg-[#FAF7F2] border-[#E2DDD5] opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(idx)}
                      className="mt-0.5 rounded text-[#4F6D52] focus:ring-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#2C2926]">{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#7A746B] border border-[#E2DDD5]">
                          📅 {item.deadline}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#7A746B] border border-[#E2DDD5]">
                          {item.priority}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-[#6B655B] mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE4DC]">
          <button
            type="button"
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B655B] hover:bg-[#F2EFEB] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIndices.length === 0}
            onClick={handleConfirm}
            className="bg-[#4F6D52] hover:bg-[#3E5741] disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
          >
            Add {selectedIndices.length} Subtasks to To-Do List
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── 3. Anti-Procrastination Kickstart Modal ─── */
export function TaskKickstartModal({
  apiKey,
  task,
  personality,
  onClose,
}: {
  apiKey: string
  task: TodoItem
  personality: AIPersonality
  onClose: () => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [roastData, setRoastData] = useState<{ roast: string; microAction: string } | null>(null)

  useEffect(() => {
    if (modalRef.current) {
      animateModalIn(modalRef.current)
    }
    kickstartTask(apiKey, task, personality)
      .then((data) => {
        setRoastData(data)
        setLoading(false)
        playTaskCompleteSound()
      })
      .catch(() => {
        setRoastData({
          roast: `Stop staring at "${task.title}" and waiting for magic!`,
          microAction: 'Spend literally 2 minutes setting up the very first step.',
        })
        setLoading(false)
      })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2926]/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-3xl border border-[#E6E0D6] shadow-2xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🥊</span>
            <div>
              <h2 className="font-display text-xl font-bold text-[#2C2926]">
                Anti-Procrastination Kickstart
              </h2>
              <p className="text-xs text-[#7A746B]">
                Tough love & the 5-minute rule to destroy inertia
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="w-8 h-8 rounded-full bg-[#F5F2EC] hover:bg-[#EAE5DC] text-[#6B655B] flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Task Details */}
        <div className="p-3 bg-[#FAF7F2] border border-[#E2DDD5] rounded-2xl">
          <span className="text-[10px] font-bold text-[#8F8A80] uppercase tracking-wider">
            Target Task
          </span>
          <h3 className="text-base font-bold text-[#2C2926] mt-0.5">{task.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-[#6B655B]">
            <span>📅 {task.deadline || 'No deadline'}</span>
            <span>•</span>
            <span>{task.category}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-8 h-8 border-3 border-[#CC8F3F] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#7A746B]">
              Your coach is analyzing your procrastination... ⏳
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* The Roast */}
            <div className="p-4 bg-gradient-to-br from-[#2C2926] to-[#3D3833] text-[#FAF7F2] rounded-2xl shadow-sm border border-[#4A4540] space-y-1">
              <span className="text-[10px] font-bold text-[#FFD180] uppercase tracking-wider">
                {personality === 'savage' ? '😈 The Savage Roast' : '🪖 Drill Callout'}
              </span>
              <p className="text-sm font-medium leading-relaxed italic">
                "{roastData?.roast}"
              </p>
            </div>

            {/* The 5-Minute Micro-Action */}
            <div className="p-4 bg-[#EFF6F0] border border-[#D2E3D2] rounded-2xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F6D52]">
                <span>⚡</span>
                <span>Your 5-Minute Starter Action</span>
              </div>
              <p className="text-xs sm:text-sm text-[#2C2926] font-medium leading-relaxed">
                {roastData?.microAction}
              </p>
              <p className="text-[11px] text-[#6B655B] pt-1">
                Tip: Once you start for just 5 minutes, 80% of procrastination evaporates.
              </p>
            </div>
          </div>
        )}

        {/* Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="w-full bg-[#4F6D52] hover:bg-[#3E5741] text-white font-bold py-3 px-4 rounded-2xl text-xs shadow-md transition-all cursor-pointer active:scale-95 text-center"
          >
            I'm Doing This Right Now! 🚀
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── 4. AI Overdue Triage Modal ─── */
export function OverdueTriageModal({
  apiKey,
  overdueTasks,
  todayDate,
  onClose,
  onApplyTriage,
}: {
  apiKey: string
  overdueTasks: TodoItem[]
  todayDate: string
  onClose: () => void
  onApplyTriage: (suggestions: TriageSuggestion[]) => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<TriageSuggestion[]>([])

  useEffect(() => {
    if (modalRef.current) {
      animateModalIn(modalRef.current)
    }
    triageOverdueTasks(apiKey, overdueTasks, todayDate)
      .then((res) => {
        setSuggestions(res)
        setLoading(false)
        playTaskCompleteSound()
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2926]/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-white rounded-3xl border border-[#E6E0D6] shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🧹</span>
            <div>
              <h2 className="font-display text-xl font-bold text-[#2C2926]">
                AI Overdue Triage & Reschedule
              </h2>
              <p className="text-xs text-[#7A746B]">
                Smartly redistribute overdue tasks across the week to stop burnout
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="w-8 h-8 rounded-full bg-[#F5F2EC] hover:bg-[#EAE5DC] text-[#6B655B] flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#B24C38] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#7A746B]">
              Groq AI is balancing your workload across the upcoming days... ⏳
            </p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#7A746B]">
            No redistribution suggestions generated.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[#6B655B]">
              Here is Groq's proposed schedule to realistically clear your backlog:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#FAF7F2] border border-[#E2DDD5] rounded-2xl space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-[#2C2926]">
                    <span>{item.title}</span>
                    <span className="text-[#4F6D52] bg-white px-2 py-0.5 rounded-md border border-[#D2E3D2]">
                      New: {item.proposedDeadline}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A746B] italic">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE4DC]">
          <button
            type="button"
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B655B] hover:bg-[#F2EFEB] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={suggestions.length === 0}
            onClick={() => {
              playClickSound()
              onApplyTriage(suggestions)
              onClose()
            }}
            className="bg-[#4F6D52] hover:bg-[#3E5741] disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
          >
            Apply New Schedule to All
          </button>
        </div>
      </div>
    </div>
  )
}
