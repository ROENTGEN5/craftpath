import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useStore, getLocalDateString, getRelativeDays, getTomorrowString, getDaysAheadString } from './store'
import { TodoItem, Priority, UserAccount, Recurrence } from './types'
import {
  animateFadeSlideUp,
  animateModalIn,
  animateBounce,
  animateJelly,
  spawnParticleBurst,
  triggerCelebration,
  applyCardTilt,
  resetCardTilt,
} from './utils/animations'
import {
  playClickSound,
  playPopSound,
  playTaskCompleteSound,
  playStreakCelebrationSound,
  playRescheduleSound,
  playDeleteSound,
} from './utils/sound'
import {
  generateDailyRoast,
  parseNaturalLanguageInput,
  SubtaskSuggestion,
  TriageSuggestion,
} from './utils/groq'
import {
  AICoachSettingsModal,
  MagicBreakdownModal,
  TaskKickstartModal,
  OverdueTriageModal,
} from './components/AIModals'
import { sendEmailBriefing, getMailtoLink, EmailDispatchResult } from './utils/email'

/* ─── 3D Magnetic Tilt Card Component ─── */
function TiltCard({
  children,
  className = '',
  style = {},
  onClick,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={cardRef}
      onMouseMove={(e) => cardRef.current && applyCardTilt(cardRef.current, e)}
      onMouseLeave={() => cardRef.current && resetCardTilt(cardRef.current)}
      onClick={onClick}
      style={style}
      className={`tilt-card relative overflow-hidden ${className}`}
    >
      <div className="tilt-card-sheen pointer-events-none" />
      <div className="tilt-3d-depth h-full w-full relative z-10">{children}</div>
    </div>
  )
}

/* ─── Category Constants ─── */
const CATEGORIES = [
  { name: 'Work', color: '#B26E53', bg: '#FAF0EB', border: '#E8D5C8', icon: '💼' },
  { name: 'Creative', color: '#CC8F3F', bg: '#FBF5EB', border: '#EED9C2', icon: '🎨' },
  { name: 'Personal', color: '#6E8B6B', bg: '#F0F5F1', border: '#CFE0D1', icon: '🌿' },
  { name: 'Health', color: '#4F7959', bg: '#EBF4ED', border: '#C7DEC9', icon: '🏃' },
  { name: 'Study', color: '#5B6B77', bg: '#F0F3F5', border: '#D3DCE1', icon: '📚' },
]

function getCategoryMeta(catName: string) {
  const found = CATEGORIES.find((c) => c.name.toLowerCase() === catName.toLowerCase())
  if (found) return found
  return { name: catName, color: '#5B6B77', bg: '#F2F2F0', border: '#E0E0DC', icon: '📌' }
}

function getPriorityBadge(priority: Priority) {
  switch (priority) {
    case 'high':
      return { label: 'High Priority', color: '#B24C38', bg: '#FDF2F0', border: '#F2C8C2', dot: '#D9432B' }
    case 'medium':
      return { label: 'Medium', color: '#B87B2E', bg: '#FCF7ED', border: '#EED9B8', dot: '#CC8F3F' }
    case 'low':
      return { label: 'Low', color: '#516E4E', bg: '#F2F7F2', border: '#D2E3D2', dot: '#6E8B6B' }
  }
}

function getRecurrenceMeta(recurrence?: Recurrence) {
  switch (recurrence) {
    case 'daily':
      return {
        label: 'Everyday',
        icon: '🔁',
        color: '#4F6D52',
        bg: '#EFF6F0',
        border: '#D2E3D2',
        desc: 'Repeats every day',
      }
    case 'weekdays':
      return {
        label: 'Weekdays',
        icon: '💼',
        color: '#5B6B77',
        bg: '#F0F3F5',
        border: '#D3DCE1',
        desc: 'Mon to Fri',
      }
    case 'weekly':
      return {
        label: 'Weekly',
        icon: '🗓️',
        color: '#B87B2E',
        bg: '#FCF7ED',
        border: '#EED9B8',
        desc: 'Every 7 days',
      }
    default:
      return null
  }
}

export function App() {
  const {
    currentUser,
    accounts,
    accountData,
    todos,
    streakCount,
    lastCompletedDate,
    streakHistory,
    isOnboarded,
    soundEnabled,
    emailReminder,
    aiSettings,
    addTodo,
    toggleTodo,
    rescheduleTodo,
    deleteTodo,
    updateTodo,
    updateUserName,
    toggleSound,
    setEmailReminder,
    setAISettings,
    createAccount,
    switchAccount,
    logout,
    deleteAccount,
    resetToNewUser,
    syncWithFirestore,
  } = useStore()

  // Sync with Firestore when app mounts
  useEffect(() => {
    syncWithFirestore()
  }, [])

  // View state for when user is not signed in
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  // UI States
  const [activeDateTab, setActiveDateTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCompletedOpen, setIsCompletedOpen] = useState(true)

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)
  const [showStreakModal, setShowStreakModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [streakToast, setStreakToast] = useState<{ message: string; show: boolean } | null>(null)

  // AI Feature Modals & State
  const [showAICoachModal, setShowAICoachModal] = useState(false)
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [breakdownGoal, setBreakdownGoal] = useState('')
  const [breakdownCategory, setBreakdownCategory] = useState('Work')
  const [breakdownPriority, setBreakdownPriority] = useState<Priority>('medium')
  const [breakdownDeadline, setBreakdownDeadline] = useState(getLocalDateString())
  const [showKickstartModal, setShowKickstartModal] = useState(false)
  const [kickstartTarget, setKickstartTarget] = useState<TodoItem | null>(null)
  const [showTriageModal, setShowTriageModal] = useState(false)

  // Daily Roast
  const [dailyRoast, setDailyRoast] = useState(() => {
    const saved = aiSettings?.lastRoast || ''
    return saved.startsWith('Failed to fetch roast') || saved.startsWith('Error:') ? '' : saved
  })
  const [roastError, setRoastError] = useState<string | null>(null)
  const [isRoastLoading, setIsRoastLoading] = useState(false)

  // Natural Language Quick Capture state
  const [isNLMode, setIsNLMode] = useState(false)
  const [nlInput, setNlInput] = useState('')
  const [isParsingNL, setIsParsingNL] = useState(false)

  // Quick Add Input State
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDeadline, setQuickDeadline] = useState(getLocalDateString())
  const [quickPriority, setQuickPriority] = useState<Priority>('medium')
  const [quickCategory, setQuickCategory] = useState('Work')
  const [quickRecurrence, setQuickRecurrence] = useState<Recurrence>('none')

  const today = getLocalDateString()
  const tomorrow = getTomorrowString()
  const safeTodos = todos || []

  // Did user complete any task today?
  const completedTodayCount = safeTodos.filter((t) => t.done && t.completedAt?.startsWith(today)).length
  const isStreakMaintainedToday = completedTodayCount > 0

  // Date categorization (called unconditionally on every render)
  const {
    overdueTodos,
    todayTodos,
    tomorrowTodos,
    upcomingTodos,
    completedTodos,
  } = useMemo(() => {
    const overdue: TodoItem[] = []
    const dueToday: TodoItem[] = []
    const dueTomorrow: TodoItem[] = []
    const upcoming: TodoItem[] = []
    const completed: TodoItem[] = []

    safeTodos.forEach((t) => {
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = (t.title || '').toLowerCase().includes(q)
        const matchesDesc = (t.description || '').toLowerCase().includes(q)
        const matchesCat = (t.category || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesDesc && !matchesCat) return
      }

      // Filter by category
      if (selectedCategory !== 'all' && (t.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return
      }

      if (t.done) {
        completed.push(t)
        return
      }

      if (!t.deadline) {
        upcoming.push(t)
        return
      }

      const deadlineDate = (t.deadline || '').split('T')[0]
      if (deadlineDate < today) {
        overdue.push(t)
      } else if (deadlineDate === today) {
        dueToday.push(t)
      } else if (deadlineDate === tomorrow) {
        dueTomorrow.push(t)
      } else {
        upcoming.push(t)
      }
    })

    const sortByPriorityAndDeadline = (a: TodoItem, b: TodoItem) => {
      const pWeight: Record<Priority, number> = { high: 3, medium: 2, low: 1 }
      const aWeight = pWeight[a.priority] || 2
      const bWeight = pWeight[b.priority] || 2
      if (bWeight !== aWeight) {
        return bWeight - aWeight
      }
      return (a.deadline || '').localeCompare(b.deadline || '')
    }

    overdue.sort(sortByPriorityAndDeadline)
    dueToday.sort(sortByPriorityAndDeadline)
    dueTomorrow.sort(sortByPriorityAndDeadline)
    upcoming.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
    completed.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))

    return {
      overdueTodos: overdue,
      todayTodos: dueToday,
      tomorrowTodos: dueTomorrow,
      upcomingTodos: upcoming,
      completedTodos: completed,
    }
  }, [safeTodos, searchQuery, selectedCategory, today, tomorrow])

  // Counts for Today's Hero Progress
  const totalTodayTasks = safeTodos.filter(
    (t) => (t.deadline?.split('T')[0] === today) || (t.done && t.completedAt?.startsWith(today))
  ).length

  const doneTodayTasks = safeTodos.filter(
    (t) => t.done && ((t.deadline?.split('T')[0] === today) || t.completedAt?.startsWith(today))
  ).length

  const todayProgressPercent = totalTodayTasks === 0 ? 100 : Math.round((doneTodayTasks / totalTodayTasks) * 100)

  // If user is not logged in / not onboarded:
  if (!currentUser || !isOnboarded) {
    if ((accounts || []).length > 0 && !isCreatingAccount) {
      return (
        <AccountPickerScreen
          accounts={accounts || []}
          accountData={accountData || {}}
          onSelectAccount={(id) => switchAccount(id)}
          onCreateNew={() => setIsCreatingAccount(true)}
          onDeleteAccount={(id) => deleteAccount(id)}
        />
      )
    }

    return (
      <OnboardingScreen
        onComplete={(name, title, deadline, priority, category, recurrence) => {
          createAccount(name, title, deadline, priority, category, recurrence)
          setIsCreatingAccount(false)
        }}
        onSwitchToLogin={(accounts || []).length > 0 ? () => setIsCreatingAccount(false) : undefined}
        hasExistingAccounts={(accounts || []).length > 0}
      />
    )
  }


  // Handle Quick Add
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim()) return

    addTodo({
      title: quickTitle.trim(),
      deadline: quickDeadline,
      priority: quickPriority,
      category: quickCategory,
      recurrence: quickRecurrence,
      done: false,
    })

    setQuickTitle('')
    setQuickRecurrence('none')
  }

  // Handle Natural Language AI Quick Add
  const handleNLSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nlInput.trim()) return

    if (!aiSettings.groqApiKey) {
      setShowAICoachModal(true)
      return
    }

    setIsParsingNL(true)
    playClickSound()
    try {
      const parsed = await parseNaturalLanguageInput(aiSettings.groqApiKey, nlInput.trim(), today)
      addTodo({
        title: parsed.title,
        description: parsed.description,
        deadline: parsed.deadline,
        priority: parsed.priority,
        category: parsed.category,
        recurrence: parsed.recurrence,
        done: false,
      })
      setNlInput('')
      playTaskCompleteSound()
      setStreakToast({
        message: `✨ AI parsed & scheduled: "${parsed.title}" for ${formatFriendlyDate(parsed.deadline)}`,
        show: true,
      })
      setTimeout(() => setStreakToast(null), 4000)
    } catch (err) {
      console.error('NLP Parse error:', err)
    } finally {
      setIsParsingNL(false)
    }
  }

  // Trigger or refresh daily roast
  const handleTriggerRoast = async (overrideApiKey?: string) => {
    const key = (overrideApiKey || aiSettings?.groqApiKey || '').trim()
    if (!key) {
      setShowAICoachModal(true)
      return
    }
    playClickSound()
    setIsRoastLoading(true)
    setRoastError(null)
    try {
      const roast = await generateDailyRoast(key, {
        userName: currentUser?.name || 'Maker',
        todayTasks: todayTodos,
        overdueTasks: overdueTodos,
        completedTodayCount,
        streakCount,
        personality: aiSettings.personality || 'savage',
      })
      setDailyRoast(roast)
      setRoastError(null)
      setAISettings({ lastRoast: roast, lastRoastDate: today })
      playTaskCompleteSound()
    } catch (err: any) {
      console.error('Roast error:', err)
      const errorMsg = err?.message || 'Failed to fetch roast. Please check your Groq connection.'
      setRoastError(errorMsg)
    } finally {
      setIsRoastLoading(false)
    }
  }

  // Auto-generate roast once per day if key exists and no roast for today
  useEffect(() => {
    if (
      aiSettings?.groqApiKey &&
      aiSettings.enabled &&
      (!dailyRoast || aiSettings.lastRoastDate !== today || aiSettings.lastRoast?.startsWith('Failed to fetch')) &&
      currentUser
    ) {
      handleTriggerRoast()
    }
  }, [currentUser?.id, today, aiSettings?.groqApiKey])

  // Auto-send daily email briefing when scheduled time arrives
  useEffect(() => {
    if (!emailReminder?.enabled || !emailReminder.email || !currentUser) return

    const checkAndSendEmail = () => {
      const now = new Date()
      const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const targetTime = emailReminder.time || '08:00'

      // Check frequency: if weekdays and today is Saturday (6) or Sunday (0), skip
      const dayOfWeek = now.getDay()
      if (emailReminder.frequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return
      }

      // If scheduled time has arrived and hasn't been sent today
      if (currentHourMin >= targetTime && emailReminder.lastSentDate !== today) {
        sendEmailBriefing(
          emailReminder.email,
          currentUser.name || 'Maker',
          today,
          streakCount,
          todayTodos,
          overdueTodos,
          dailyRoast
        ).then((res) => {
          if (res.success) {
            setEmailReminder({ ...emailReminder, lastSentDate: today })
          }
        })
      }
    }

    checkAndSendEmail()
    const timer = setInterval(checkAndSendEmail, 60000)
    return () => clearInterval(timer)
  }, [today, emailReminder?.enabled, emailReminder?.time, emailReminder?.lastSentDate, currentUser?.id])

  // Handle Checkbox Click with animation and calming sound
  const handleToggleTodo = (todo: TodoItem, e: React.MouseEvent<HTMLButtonElement>) => {
    const isNowDone = !todo.done
    const buttonEl = e.currentTarget

    animateBounce(buttonEl)
    playPopSound()

    if (isNowDone) {
      playTaskCompleteSound()
      const rect = buttonEl.getBoundingClientRect()
      spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 16)

      const didExtend = toggleTodo(todo.id)
      if (todo.recurrence && todo.recurrence !== 'none') {
        playStreakCelebrationSound()
        triggerCelebration()
        setStreakToast({
          message: `🔁 Recurring task complete! Next instance automatically scheduled for tomorrow. (${streakCount + (didExtend ? 1 : 0)} day streak)`,
          show: true,
        })
        setTimeout(() => setStreakToast(null), 4000)
      } else if (didExtend) {
        playStreakCelebrationSound()
        triggerCelebration()
        setStreakToast({
          message: `🔥 Streak extended! You've crushed a task today! (${streakCount + 1} day streak)`,
          show: true,
        })
        setTimeout(() => setStreakToast(null), 4000)
      }
    } else {
      toggleTodo(todo.id)
    }
  }

  // Handle Quick Reschedule / Postpone
  const handleReschedule = (todoId: string, newDate: string) => {
    playRescheduleSound()
    rescheduleTodo(todoId, newDate)
    setStreakToast({
      message: `📅 Task rescheduled to ${formatSpecificDate(newDate)}!`,
      show: true,
    })
    setTimeout(() => setStreakToast(null), 3000)
  }

  // Handle Delete with sound
  const handleDeleteTodo = (todoId: string) => {
    playDeleteSound()
    deleteTodo(todoId)
  }

  const handleEditClick = (todo: TodoItem) => {
    playClickSound()
    setEditingTodo(todo)
    setShowTaskModal(true)
  }

  // Format date specifically for display and selection
  const formatSpecificDate = (dateStr: string) => {
    if (!dateStr) return 'Pick a date'
    const cleanDate = dateStr.split('T')[0]
    const [y, m, d] = cleanDate.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (cleanDate === today) return `Today (${dayName}, ${monthDay})`
    if (cleanDate === tomorrow) return `Tomorrow (${dayName}, ${monthDay})`

    return `${dayName}, ${monthDay}`
  }

  // Format date readable on task cards with exact date and relative context
  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return 'No deadline'
    const cleanDate = dateStr.split('T')[0]
    const daysDiff = getRelativeDays(cleanDate)

    const [y, m, d] = cleanDate.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (cleanDate === today) return `Today • ${dayName}, ${monthDay}`
    if (cleanDate === tomorrow) return `Tomorrow • ${dayName}, ${monthDay}`
    if (daysDiff < 0) return `${monthDay} (${Math.abs(daysDiff)}d overdue)`
    if (daysDiff > 0 && daysDiff <= 7) return `${dayName}, ${monthDay} (in ${daysDiff}d)`
    return `${dayName}, ${monthDay}`
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#2C2926] relative pb-20 selection:bg-[#CC8F3F]/20 selection:text-[#2C2926]">
      {/* Background Ambient Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="ambient-orb-1 absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#EADCC9]/50 blur-3xl" />
        <div className="ambient-orb-2 absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-[#DFE7DD]/50 blur-3xl" />
      </div>

      {/* Streak Toast Notification */}
      {streakToast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce duration-300">
          <div className="bg-[#2C2926] text-[#FAF7F2] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#4A4540]">
            <span className="text-xl">🔥</span>
            <div>
              <p className="font-bold text-sm text-[#FFD180]">Streak Kept Alive!</p>
              <p className="text-xs text-[#DDD8CE]">{streakToast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#F7F5F0]/90 backdrop-blur-md border-b border-[#E6E0D6] px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6D52] text-white flex items-center justify-center font-bold shadow-md shadow-[#4F6D52]/20 text-lg">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-tight text-[#2C2926]">
                  CraftPath
                </span>
                <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded-full bg-[#4F6D52]/10 text-[#4F6D52] border border-[#4F6D52]/20">
                  Focus Studio
                </span>
              </div>
              <p className="text-[11px] text-[#7A746B] hidden sm:block">
                Daily Accomplishments & Intentional Deadlines
              </p>
            </div>
          </div>

          {/* Center / Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sound Toggle Button */}
            <button
              onClick={() => {
                toggleSound()
                playClickSound()
              }}
              className={`p-2 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                soundEnabled
                  ? 'bg-white border-[#E2DDD5] text-[#4F6D52] hover:border-[#4F6D52]'
                  : 'bg-[#FAF7F2] border-[#E2DDD5] text-[#8F8A80] hover:text-[#2C2926]'
              }`}
              title={soundEnabled ? 'Calming sounds enabled (Click to mute)' : 'Sounds muted (Click to enable)'}
            >
              <span className="text-sm">{soundEnabled ? '🔊' : '🔇'}</span>
            </button>

            {/* Daily Email Digest Button */}
            <button
              onClick={() => {
                playClickSound()
                setShowEmailModal(true)
              }}
              className="flex items-center gap-1.5 text-xs text-[#544F47] hover:text-[#2C2926] bg-white border border-[#E2DDD5] hover:border-[#BDB5A7] px-3 py-1.5 rounded-2xl transition-all cursor-pointer shadow-xs"
              title="Setup everyday email reminders for tasks"
            >
              <span>✉️</span>
              <span className="hidden md:inline font-medium">Daily Email</span>
              {emailReminder?.enabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F6D52]" />
              )}
            </button>

            {/* AI Coach Button */}
            <button
              onClick={() => {
                playClickSound()
                setShowAICoachModal(true)
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl transition-all cursor-pointer shadow-xs border ${
                aiSettings.groqApiKey
                  ? 'bg-[#F4EFE6] border-[#DED7CC] text-[#2C2926] hover:border-[#4F6D52]'
                  : 'bg-white border-[#E2DDD5] text-[#7A746B] hover:text-[#2C2926]'
              }`}
              title="Configure Groq AI Coach & Settings"
            >
              <span>{aiSettings.personality === 'savage' ? '😈' : aiSettings.personality === 'sergeant' ? '🪖' : '🧘'}</span>
              <span className="hidden md:inline font-medium">AI Coach</span>
              {aiSettings.groqApiKey && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F6D52]" title="Groq AI Active" />
              )}
            </button>

            {/* Streak Counter Pill */}
            <button
              onClick={() => {
                playClickSound()
                setShowStreakModal(true)
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                isStreakMaintainedToday
                  ? 'bg-[#FCF5EB] border-[#E8CBA5] text-[#9E5D1E] shadow-[#CC8F3F]/10'
                  : 'bg-white/80 border-[#E2DDD5] text-[#6B655B] hover:border-[#CC8F3F]/60'
              }`}
              title="Click to view streak rules & history"
            >
              <span className={`text-base ${isStreakMaintainedToday ? 'streak-pulse' : ''}`}>🔥</span>
              <div className="text-left">
                <span className="text-xs font-bold font-sans">
                  {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
                </span>
                <span className="text-[10px] block text-[#968E82] leading-none">
                  {isStreakMaintainedToday ? 'Secured today' : '1 task needed today'}
                </span>
              </div>
            </button>

            {/* Quick Add Button (Desktop) */}
            <button
              onClick={() => {
                playClickSound()
                setEditingTodo(null)
                setShowTaskModal(true)
              }}
              className="hidden sm:flex items-center gap-2 bg-[#4F6D52] hover:bg-[#435C45] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>+</span>
              <span>New Task</span>
            </button>

            {/* User Profile Button */}
            <button
              onClick={() => {
                playClickSound()
                setShowProfileModal(true)
              }}
              className="flex items-center gap-2 bg-white border border-[#E2DDD5] hover:border-[#BDB5A7] px-3 py-1.5 rounded-2xl transition-all cursor-pointer shadow-sm"
              title="Profile & Settings"
            >
              <div
                className="w-7 h-7 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-inner"
                style={{ backgroundColor: currentUser?.avatarColor || '#CC8F3F' }}
              >
                {currentUser?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-medium text-[#4A4540] hidden md:inline">
                {currentUser?.name || 'Alex'}
              </span>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={() => {
                playClickSound()
                logout()
              }}
              className="flex items-center gap-1.5 text-xs text-[#7A746B] hover:text-[#B24C38] bg-white/70 hover:bg-[#FDF2F0] border border-[#E2DDD5] hover:border-[#F2C8C2] px-3 py-1.5 rounded-2xl transition-all cursor-pointer shadow-xs"
              title="Sign out and switch accounts"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </header>


      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 space-y-8 relative z-10">
        {/* ─── Hero / Daily Briefing Section ─── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAF7F2] via-[#F4EFE6] to-[#ECE4D8] border border-[#E6E0D5] p-6 sm:p-8 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Greeting & Customization */}
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#E0D8CC] text-xs text-[#7A746B] font-medium shadow-xs">
                <span>🗓️</span>
                <span>{todayFormatted}</span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl text-[#2C2926] tracking-tight leading-snug">
                Hey{' '}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="underline decoration-dashed decoration-[#CC8F3F]/60 underline-offset-4 hover:text-[#4F6D52] transition-colors cursor-pointer"
                  title="Click to change your name"
                >
                  {currentUser?.name || 'Alex'}
                </button>
                , here’s what you are going to accomplish today.
              </h1>

              <p className="text-sm sm:text-base text-[#6B655B] leading-relaxed">
                {totalTodayTasks === 0 ? (
                  <span>
                    Your calendar is open today. Post a new objective below or get ahead on upcoming deadlines.
                  </span>
                ) : doneTodayTasks === totalTodayTasks ? (
                  <span className="text-[#4F6D52] font-semibold">
                    🎉 Incredible focus! You have completed all {totalTodayTasks} scheduled tasks for today and kept your {streakCount}-day streak burning!
                  </span>
                ) : (
                  <span>
                    You have <strong className="text-[#2C2926]">{totalTodayTasks - doneTodayTasks}</strong> remaining{' '}
                    {totalTodayTasks - doneTodayTasks === 1 ? 'task' : 'tasks'} scheduled for today.{' '}
                    {isStreakMaintainedToday ? (
                      <span className="text-[#4F6D52] font-medium">🔥 Streak secured for today!</span>
                    ) : (
                      <span className="text-[#B87B2E] font-medium">⚡ Complete at least 1 task to maintain your streak!</span>
                    )}
                  </span>
                )}
              </p>
            </div>

            {/* Quick Metrics Badge Card */}
            <div className="flex md:flex-col items-center sm:items-end justify-between gap-4 border-t md:border-t-0 md:border-l border-[#E2DDD4] pt-4 md:pt-0 md:pl-8">
              {/* Today's Completion Bar */}
              <div className="text-left md:text-right w-full sm:w-48">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5 text-[#544F47]">
                  <span>Today's Progress</span>
                  <span>{todayProgressPercent}%</span>
                </div>
                <div className="h-2.5 w-full bg-[#E0D8CC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6E8B6B] to-[#4F6D52] transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${todayProgressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#8C857B] mt-1 block">
                  {doneTodayTasks} of {totalTodayTasks} completed
                </span>
              </div>

              {/* Streak Card Pill */}
              <div className="bg-white/80 border border-[#E0D8CC] px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xs">
                <span className="text-2xl">🔥</span>
                <div className="text-left">
                  <span className="text-xs font-bold text-[#2C2926] block">
                    {streakCount} Day Streak
                  </span>
                  <span className="text-[10px] text-[#7A746B]">
                    {isStreakMaintainedToday ? 'Active for today' : '1 task needed today'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Strict AI Coach Roast & Briefing Banner ─── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2C2926] via-[#3A3530] to-[#24211E] text-[#FAF7F2] p-6 sm:p-7 shadow-lg border border-[#4A4540]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#CC8F3F]/20 border border-[#CC8F3F]/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                {aiSettings.personality === 'savage' ? '😈' : aiSettings.personality === 'sergeant' ? '🪖' : '🧘'}
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-[#FFD180] tracking-wide uppercase">
                    {aiSettings.personality === 'savage' ? 'Savage AI Coach (Roast Mode)' : aiSettings.personality === 'sergeant' ? 'Drill Sergeant Coach' : 'Wise Mentor Coach'}
                  </span>
                  {!aiSettings.groqApiKey && (
                    <span className="text-[10px] bg-[#B24C38]/40 border border-[#B24C38] text-[#FFA899] px-2 py-0.2 rounded-full font-semibold">
                      API Key Needed
                    </span>
                  )}
                </div>

                {isRoastLoading ? (
                  <p className="text-sm text-[#DDD8CE] animate-pulse">
                    Analyzing your tasks and cooking up a roast... ⏳
                  </p>
                ) : roastError ? (
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-[#F28B82] font-semibold leading-relaxed flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{roastError}</span>
                    </p>
                    <p className="text-[11px] text-[#CCC5B8]">
                      Click "Roast Me" to retry, or check your settings.
                    </p>
                  </div>
                ) : dailyRoast ? (
                  <p className="text-sm sm:text-base text-[#FAF7F2] font-medium leading-relaxed italic">
                    "{dailyRoast}"
                  </p>
                ) : !aiSettings.groqApiKey ? (
                  <p className="text-xs sm:text-sm text-[#CCC5B8] leading-relaxed">
                    Want an uncensored AI coach to ruthlessly roast your procrastination and hold your streaks accountable? Connect your free Groq API key!
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-[#CCC5B8] leading-relaxed">
                    Click "Roast Me" to evaluate your tasks and get your tough-love daily briefing.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {aiSettings.groqApiKey ? (
                <button
                  onClick={() => handleTriggerRoast()}
                  disabled={isRoastLoading}
                  className="bg-[#CC8F3F] hover:bg-[#B87B2E] disabled:opacity-50 text-[#2C2926] text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>🥊</span>
                  <span>{isRoastLoading ? 'Cooking...' : roastError ? 'Retry Roast' : 'Roast Me'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAICoachModal(true)}
                  className="bg-[#CC8F3F] hover:bg-[#B87B2E] text-[#2C2926] text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  🔑 Connect Groq Key
                </button>
              )}
              <button
                onClick={() => setShowAICoachModal(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#FAF7F2] border border-white/10 transition-colors cursor-pointer text-xs"
                title="AI Settings"
              >
                ⚙️
              </button>
            </div>
          </div>
        </section>

        {/* ─── Inline Quick Add Task Bar ─── */}
        <section className="bg-white border border-[#E6E0D6] rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
          {/* Mode Switcher: Classic vs Natural Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-[#F0ECE4] p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsNLMode(false)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  !isNLMode ? 'bg-white text-[#2C2926] shadow-2xs' : 'text-[#7A746B] hover:text-[#2C2926]'
                }`}
              >
                📝 Classic
              </button>
              <button
                type="button"
                onClick={() => setIsNLMode(true)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isNLMode ? 'bg-white text-[#2C2926] shadow-2xs' : 'text-[#7A746B] hover:text-[#2C2926]'
                }`}
              >
                <span>⚡</span>
                <span>AI Quick Parse</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!aiSettings.groqApiKey) {
                  setShowAICoachModal(true)
                } else {
                  setBreakdownGoal(quickTitle || nlInput || '')
                  setShowBreakdownModal(true)
                }
              }}
              className="text-xs text-[#CC8F3F] hover:text-[#B87B2E] font-semibold flex items-center gap-1 cursor-pointer"
              title="Deconstruct a big goal into bite-sized steps"
            >
              <span>🪄</span>
              <span>Magic Breakdown</span>
            </button>
          </div>

          {isNLMode ? (
            /* Natural Language AI Capture */
            <form onSubmit={handleNLSubmit} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[#F9F7F3] border border-[#E4DFD6] rounded-xl px-3 py-2.5 focus-within:border-[#4F6D52] focus-within:ring-2 focus-within:ring-[#4F6D52]/10 transition-all">
                <span className="text-sm">✨</span>
                <input
                  type="text"
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  placeholder="e.g. Schedule meeting with design team next Tuesday 2pm high priority Work..."
                  className="w-full bg-transparent text-sm text-[#2C2926] placeholder-[#9C968B] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isParsingNL || !nlInput.trim()}
                className="bg-[#4F6D52] hover:bg-[#3E5741] disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap active:scale-95"
              >
                {isParsingNL ? 'Parsing...' : '✨ Parse & Add'}
              </button>
            </form>
          ) : (
            /* Classic Form Input */
            <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-[#F9F7F3] border border-[#E4DFD6] rounded-xl px-3 py-2.5 focus-within:border-[#4F6D52] focus-within:ring-2 focus-within:ring-[#4F6D52]/10 transition-all">
                <span className="text-sm text-[#8F8A80]">✏️</span>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="What is your next to-do? (e.g., Draft design proposal, review budget...)"
                  className="w-full bg-transparent text-sm text-[#2C2926] placeholder-[#9C968B] focus:outline-none"
                />
              </div>

              {/* Quick Controls: Deadline & Category */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {/* Specific Deadline Selector with Calendar Picker */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="relative flex items-center bg-[#F9F7F3] hover:bg-[#F2EFEB] border border-[#E4DFD6] focus-within:border-[#4F6D52] rounded-xl px-3 py-1.5 text-xs text-[#544F47] transition-all cursor-pointer group"
                    title="Click to pick any specific date from calendar"
                  >
                    <span className="mr-1.5 text-sm">📅</span>
                    <span className="font-semibold text-[#2C2926] pr-1.5 whitespace-nowrap">
                      {formatSpecificDate(quickDeadline)}
                    </span>
                    <input
                      type="date"
                      value={quickDeadline}
                      onChange={(e) => setQuickDeadline(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="text-[10px] text-[#8F8A80] group-hover:text-[#4F6D52] transition-colors">
                      ▼
                    </span>
                  </div>

                  {/* Quick 1-click presets */}
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(today)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                      quickDeadline === today
                        ? 'bg-[#4F6D52] text-white border-[#4F6D52] font-semibold'
                        : 'bg-[#FAF7F2] text-[#6B655B] border-[#E4DFD6] hover:border-[#4F6D52]'
                    }`}
                    title="Set deadline to today"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(tomorrow)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                      quickDeadline === tomorrow
                        ? 'bg-[#4F6D52] text-white border-[#4F6D52] font-semibold'
                        : 'bg-[#FAF7F2] text-[#6B655B] border-[#E4DFD6] hover:border-[#4F6D52]'
                    }`}
                    title="Set deadline to tomorrow"
                  >
                    Tomorrow
                  </button>
                </div>

                {/* Priority */}
                <select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value as Priority)}
                  className="bg-[#F9F7F3] border border-[#E4DFD6] rounded-xl px-2.5 py-1.5 text-xs text-[#544F47] focus:outline-none cursor-pointer"
                >
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>

                {/* Recurrence */}
                <select
                  value={quickRecurrence}
                  onChange={(e) => setQuickRecurrence(e.target.value as Recurrence)}
                  className="bg-[#F9F7F3] border border-[#E4DFD6] rounded-xl px-2.5 py-1.5 text-xs text-[#544F47] focus:outline-none cursor-pointer"
                  title="Repeat schedule"
                >
                  <option value="none">Once</option>
                  <option value="daily">🔁 Everyday</option>
                  <option value="weekdays">💼 Weekdays</option>
                  <option value="weekly">🗓️ Weekly</option>
                </select>

                {/* Category */}
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  className="bg-[#F9F7F3] border border-[#E4DFD6] rounded-xl px-2.5 py-1.5 text-xs text-[#544F47] focus:outline-none cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>

                {/* Add Button */}
                <button
                  type="submit"
                  className="bg-[#4F6D52] hover:bg-[#3E5741] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap active:scale-95"
                >
                  Add To-Do
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ─── Search & Date Filter Tabs ─── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Date Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-[#EAE5DC] p-1 rounded-2xl overflow-x-auto">
              {[
                { id: 'all', label: 'All Tasks', count: todos.filter((t) => !t.done).length },
                { id: 'today', label: 'Today', count: todayTodos.length },
                { id: 'upcoming', label: 'Upcoming', count: tomorrowTodos.length + upcomingTodos.length },
                { id: 'overdue', label: 'Overdue', count: overdueTodos.length, alert: overdueTodos.length > 0 },
                { id: 'completed', label: 'Completed', count: completedTodos.length },
              ].map((tab) => {
                const isActive = activeDateTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDateTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#2C2926] shadow-sm font-semibold'
                        : 'text-[#6B655B] hover:text-[#2C2926] hover:bg-white/50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        tab.alert
                          ? 'bg-[#B24C38] text-white font-bold'
                          : isActive
                          ? 'bg-[#EAE5DC] text-[#4A4540]'
                          : 'bg-[#DCD6CC] text-[#7A746B]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title..."
                className="w-full bg-white border border-[#E2DDD5] rounded-xl px-3 py-1.5 pl-8 text-xs text-[#2C2926] placeholder-[#9C968B] focus:outline-none focus:border-[#4F6D52]"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9C968B]">
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9C968B] hover:text-[#2C2926]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-[#2C2926] text-white border-[#2C2926] font-medium'
                  : 'bg-white border-[#E2DDD5] text-[#6B655B] hover:border-[#BDB5A7]'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase()
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'font-semibold shadow-xs'
                      : 'bg-white border-[#E2DDD5] text-[#6B655B] hover:border-[#BDB5A7]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? cat.bg : undefined,
                    borderColor: isSelected ? cat.color : undefined,
                    color: isSelected ? cat.color : undefined,
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─── Categorized Task Lists ─── */}
        <div className="space-y-8">
          {/* 1. Overdue Section */}
          {(activeDateTab === 'all' || activeDateTab === 'overdue') && overdueTodos.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#B24C38]">
                  <span className="text-base">⚠️</span>
                  <h2 className="font-display text-lg font-bold tracking-tight">Overdue Tasks</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FDF2F0] border border-[#F2C8C2] text-[#B24C38]">
                    {overdueTodos.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!aiSettings.groqApiKey) {
                        setShowAICoachModal(true)
                      } else {
                        playClickSound()
                        setShowTriageModal(true)
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#FDF2F0] hover:bg-[#FBE8E5] text-[#B24C38] border border-[#F2C8C2] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    title="Smartly redistribute overdue tasks across the week with AI"
                  >
                    <span>🧹</span>
                    <span>AI Triage & Reschedule</span>
                  </button>
                  <span className="text-xs text-[#8F8A80] hidden sm:inline">Requires immediate attention</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {overdueTodos.map((todo) => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    onToggle={(e) => handleToggleTodo(todo, e)}
                    onEdit={() => handleEditClick(todo)}
                    onDelete={() => handleDeleteTodo(todo.id)}
                    onReschedule={(newDate) => handleReschedule(todo.id, newDate)}
                    onKickstart={() => {
                      if (!aiSettings.groqApiKey) setShowAICoachModal(true)
                      else {
                        setKickstartTarget(todo)
                        setShowKickstartModal(true)
                      }
                    }}
                    onDeconstruct={() => {
                      if (!aiSettings.groqApiKey) setShowAICoachModal(true)
                      else {
                        setBreakdownGoal(todo.title)
                        setBreakdownCategory(todo.category)
                        setBreakdownPriority(todo.priority)
                        setBreakdownDeadline(todo.deadline || today)
                        setShowBreakdownModal(true)
                      }
                    }}
                    formatFriendlyDate={formatFriendlyDate}
                    isOverdue
                  />
                ))}
              </div>
            </section>
          )}

          {/* 2. Today's Focus Section */}
          {(activeDateTab === 'all' || activeDateTab === 'today') && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#2C2926]">
                  <span className="text-base">☀️</span>
                  <h2 className="font-display text-lg font-bold tracking-tight">Today’s Focus</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EBF3EC] border border-[#CFE0D1] text-[#4F6D52]">
                    {todayTodos.length} remaining
                  </span>
                </div>
                <span className="text-xs text-[#7A746B]">
                  {isStreakMaintainedToday
                    ? '🔥 Streak active for today'
                    : '⚡ Check off 1 task to maintain streak'}
                </span>
              </div>

              {todayTodos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DDD7CC] bg-white/50 p-8 text-center space-y-2">
                  <div className="text-3xl">✨</div>
                  <p className="font-display text-base font-semibold text-[#4A4540]">
                    All caught up for today!
                  </p>
                  <p className="text-xs text-[#8F8A80] max-w-sm mx-auto">
                    You have no remaining tasks scheduled for today. Add a new to-do above or review your upcoming deadlines.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {todayTodos.map((todo) => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(e) => handleToggleTodo(todo, e)}
                      onEdit={() => handleEditClick(todo)}
                      onDelete={() => handleDeleteTodo(todo.id)}
                      onReschedule={(newDate) => handleReschedule(todo.id, newDate)}
                      onKickstart={() => {
                        if (!aiSettings.groqApiKey) setShowAICoachModal(true)
                        else {
                          setKickstartTarget(todo)
                          setShowKickstartModal(true)
                        }
                      }}
                      onDeconstruct={() => {
                        if (!aiSettings.groqApiKey) setShowAICoachModal(true)
                        else {
                          setBreakdownGoal(todo.title)
                          setBreakdownCategory(todo.category)
                          setBreakdownPriority(todo.priority)
                          setBreakdownDeadline(todo.deadline || today)
                          setShowBreakdownModal(true)
                        }
                      }}
                      formatFriendlyDate={formatFriendlyDate}
                      isToday
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 3. Tomorrow's Section */}
          {(activeDateTab === 'all' || activeDateTab === 'upcoming') && tomorrowTodos.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#2C2926]">
                  <span className="text-base">🌅</span>
                  <h2 className="font-display text-lg font-bold tracking-tight">Tomorrow</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F5EFE6] border border-[#E6DDCE] text-[#826A4A]">
                    {tomorrowTodos.length}
                  </span>
                </div>
                <span className="text-xs text-[#8F8A80]">Upcoming next</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {tomorrowTodos.map((todo) => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    onToggle={(e) => handleToggleTodo(todo, e)}
                    onEdit={() => handleEditClick(todo)}
                    onDelete={() => handleDeleteTodo(todo.id)}
                    onReschedule={(newDate) => handleReschedule(todo.id, newDate)}
                    onKickstart={() => {
                      if (!aiSettings.groqApiKey) setShowAICoachModal(true)
                      else {
                        setKickstartTarget(todo)
                        setShowKickstartModal(true)
                      }
                    }}
                    onDeconstruct={() => {
                      if (!aiSettings.groqApiKey) setShowAICoachModal(true)
                      else {
                        setBreakdownGoal(todo.title)
                        setBreakdownCategory(todo.category)
                        setBreakdownPriority(todo.priority)
                        setBreakdownDeadline(todo.deadline || today)
                        setShowBreakdownModal(true)
                      }
                    }}
                    formatFriendlyDate={formatFriendlyDate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 4. Upcoming / Later Dates */}
          {(activeDateTab === 'all' || activeDateTab === 'upcoming') && upcomingTodos.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#2C2926]">
                  <span className="text-base">📅</span>
                  <h2 className="font-display text-lg font-bold tracking-tight">Later & Upcoming</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0F2F5] border border-[#D5DDE3] text-[#5B6B77]">
                    {upcomingTodos.length}
                  </span>
                </div>
                <span className="text-xs text-[#8F8A80]">Future deadlines</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {upcomingTodos.map((todo) => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    onToggle={(e) => handleToggleTodo(todo, e)}
                    onEdit={() => handleEditClick(todo)}
                    onDelete={() => handleDeleteTodo(todo.id)}
                    onReschedule={(newDate) => handleReschedule(todo.id, newDate)}
                    onKickstart={() => {
                      if (!aiSettings.groqApiKey) setShowAICoachModal(true)
                      else {
                        setKickstartTarget(todo)
                        setShowKickstartModal(true)
                      }
                    }}
                    onDeconstruct={() => {
                      if (!aiSettings.groqApiKey) setShowAICoachModal(true)
                      else {
                        setBreakdownGoal(todo.title)
                        setBreakdownCategory(todo.category)
                        setBreakdownPriority(todo.priority)
                        setBreakdownDeadline(todo.deadline || today)
                        setShowBreakdownModal(true)
                      }
                    }}
                    formatFriendlyDate={formatFriendlyDate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 5. Completed Tasks Section */}
          {(activeDateTab === 'all' || activeDateTab === 'completed') && completedTodos.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-[#E6E0D5]">
              <button
                onClick={() => {
                  playClickSound()
                  setIsCompletedOpen(!isCompletedOpen)
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/60 hover:bg-white border border-[#E4DFD6] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 text-[#4F6D52]">
                  <span className="text-base">✅</span>
                  <h2 className="font-display text-base font-bold tracking-tight">
                    Completed Tasks ({completedTodos.length})
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#8F8A80]">
                  <span>{isCompletedOpen ? 'Hide' : 'Show'}</span>
                  <span>{isCompletedOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isCompletedOpen && (
                <div className="grid grid-cols-1 gap-3">
                  {completedTodos.map((todo) => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(e) => handleToggleTodo(todo, e)}
                      onEdit={() => handleEditClick(todo)}
                      onDelete={() => handleDeleteTodo(todo.id)}
                      formatFriendlyDate={formatFriendlyDate}
                      isCompleted
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* ─── Modals ─── */}
      {/* 1. Add / Edit Task Modal */}
      {showTaskModal && (
        <TaskModal
          todo={editingTodo}
          onClose={() => {
            setShowTaskModal(false)
            setEditingTodo(null)
          }}
          onSave={(data) => {
            if (editingTodo) {
              updateTodo(editingTodo.id, data)
            } else {
              addTodo({
                title: data.title,
                description: data.description,
                deadline: data.deadline,
                category: data.category,
                priority: data.priority,
                recurrence: data.recurrence,
                done: false,
              })
            }
            setShowTaskModal(false)
            setEditingTodo(null)
          }}
        />
      )}

      {/* 2. Streak & Habits Modal */}
      {showStreakModal && (
        <StreakModal
          streakCount={streakCount}
          lastCompletedDate={lastCompletedDate}
          streakHistory={streakHistory}
          onClose={() => setShowStreakModal(false)}
        />
      )}

      {/* 3. User Profile & Customization Modal */}
      {showProfileModal && (
        <ProfileModal
          currentUser={currentUser}
          accounts={accounts}
          onClose={() => setShowProfileModal(false)}
          onUpdateName={updateUserName}
          onCreateAccount={(name) => createAccount(name)}
          onSwitchAccount={switchAccount}
          onLogout={logout}
          onReset={resetToNewUser}
        />
      )}

      {/* 4. Daily Email Digest Modal */}
      {showEmailModal && (
        <EmailDigestModal
          currentUser={currentUser}
          emailReminder={emailReminder}
          todos={todos}
          todayTodos={todayTodos}
          overdueTodos={overdueTodos}
          dailyRoast={dailyRoast}
          streakCount={streakCount}
          onClose={() => setShowEmailModal(false)}
          onSave={(settings) => {
            setEmailReminder(settings)
            setStreakToast({
              message: `✉️ Daily email reminders scheduled for ${settings.time} (${settings.email})!`,
              show: true,
            })
            setTimeout(() => setStreakToast(null), 4000)
          }}
        />
      )}

      {/* 5. Groq AI Coach & Settings Modal */}
      {showAICoachModal && (
        <AICoachSettingsModal
          aiSettings={aiSettings}
          onClose={() => setShowAICoachModal(false)}
          onSave={(settings) => {
            setAISettings(settings)
            setDailyRoast('')
            setRoastError(null)
            setStreakToast({
              message: `🤖 Groq AI settings saved! Personality: ${settings.personality || aiSettings.personality}`,
              show: true,
            })
            setTimeout(() => setStreakToast(null), 4000)
            if (settings.groqApiKey) {
              handleTriggerRoast(settings.groqApiKey)
            }
          }}
        />
      )}

      {/* 6. Magic Task Breakdown Modal */}
      {showBreakdownModal && (
        <MagicBreakdownModal
          apiKey={aiSettings.groqApiKey}
          initialGoal={breakdownGoal}
          initialCategory={breakdownCategory}
          initialPriority={breakdownPriority}
          baseDeadline={breakdownDeadline}
          onClose={() => setShowBreakdownModal(false)}
          onAddSubtasks={(tasks) => {
            tasks.forEach((t) => {
              addTodo({
                title: t.title,
                description: t.description,
                deadline: t.deadline,
                priority: t.priority,
                category: t.category,
                recurrence: t.recurrence,
                done: false,
              })
            })
            setStreakToast({
              message: `🪄 Added ${tasks.length} subtasks to your to-do list!`,
              show: true,
            })
            setTimeout(() => setStreakToast(null), 4000)
          }}
        />
      )}

      {/* 7. Anti-Procrastination Kickstart Modal */}
      {showKickstartModal && kickstartTarget && (
        <TaskKickstartModal
          apiKey={aiSettings.groqApiKey}
          task={kickstartTarget}
          personality={aiSettings.personality || 'savage'}
          onClose={() => {
            setShowKickstartModal(false)
            setKickstartTarget(null)
          }}
        />
      )}

      {/* 8. AI Overdue Triage Modal */}
      {showTriageModal && (
        <OverdueTriageModal
          apiKey={aiSettings.groqApiKey}
          overdueTasks={overdueTodos}
          todayDate={today}
          onClose={() => setShowTriageModal(false)}
          onApplyTriage={(suggestions) => {
            suggestions.forEach((s) => {
              rescheduleTodo(s.id, s.proposedDeadline)
            })
            setStreakToast({
              message: `🧹 Rescheduled ${suggestions.length} overdue tasks across the week!`,
              show: true,
            })
            setTimeout(() => setStreakToast(null), 4000)
          }}
        />
      )}
    </div>
  )
}


/* ─── Account Picker Screen (One-Click Login, No Password) ─── */
function AccountPickerScreen({
  accounts,
  accountData,
  onSelectAccount,
  onCreateNew,
  onDeleteAccount,
}: {
  accounts: UserAccount[]
  accountData: Record<string, any>
  onSelectAccount: (accountId: string) => void
  onCreateNew: () => void
  onDeleteAccount?: (accountId: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      animateFadeSlideUp(
        containerRef.current.querySelectorAll('.picker-header, .account-card, .picker-create'),
        { translateY: 20, stagger: 60, duration: 550 }
      )
    }
  }, [accounts.length])

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4 sm:p-6 text-[#2C2926] relative">
      <div className="ambient-orb-1 absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#EADCC9]/50 blur-3xl" />
      <div className="ambient-orb-2 absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-[#DFE7DD]/50 blur-3xl" />

      <div
        ref={containerRef}
        className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-[#E6E0D6] relative z-10 space-y-6"
      >
        {/* Brand Badge */}
        <div className="picker-header flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#4F6D52] flex items-center justify-center text-white font-bold text-xl shadow-md shadow-[#4F6D52]/20">
            ✓
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-[#2C2926] font-bold leading-tight">
              CraftPath Focus
            </h1>
            <p className="text-xs text-[#7A746B] font-medium tracking-wide uppercase">
              Select your account to continue
            </p>
          </div>
        </div>

        <p className="picker-header text-sm text-[#6B655B] leading-relaxed">
          Welcome back! Click your profile below to open your to-do list and keep your daily streak alive. No password needed.
        </p>

        {/* Account List */}
        <div className="space-y-3">
          {accounts.map((account) => {
            const data = accountData[account.id] || {}
            const streak = data.streakCount || 0
            const activeTodosCount = (data.todos || []).filter((t: any) => !t.done).length

            return (
              <TiltCard
                key={account.id}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 16)
                  animateJelly(e.currentTarget)
                  onSelectAccount(account.id)
                }}
                className="account-card w-full flex items-center gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8] hover:border-[#4F6D52] hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm transition-transform group-hover:scale-105"
                    style={{ backgroundColor: account.avatarColor }}
                  >
                    {account.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#2C2926] text-base truncate">
                        {account.name}
                      </p>
                      {streak > 0 && (
                        <span className="text-xs font-bold text-[#CC8F3F] bg-[#FFF8EE] border border-[#FFE2BD] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          🔥 {streak}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8F8A80]">
                      {activeTodosCount} active {activeTodosCount === 1 ? 'task' : 'tasks'} • Created {account.createdAt}
                    </p>
                  </div>

                  {/* Arrow */}
                  <span className="text-[#C4BFB5] group-hover:text-[#4F6D52] group-hover:translate-x-1 transition-all text-sm">
                    ➔
                  </span>
                </div>

                {onDeleteAccount && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Delete profile "${account.name}" and all their tasks?`)) {
                        onDeleteAccount(account.id)
                      }
                    }}
                    title={`Delete ${account.name}`}
                    className="opacity-0 group-hover:opacity-100 p-2 text-[#8F8A80] hover:text-[#B24C38] hover:bg-[#FDF2F0] rounded-xl transition-all cursor-pointer shrink-0 ml-1"
                  >
                    🗑
                  </button>
                )}
              </TiltCard>
            )
          })}
        </div>

        {/* Create New Account Button */}
        <div className="picker-create pt-2 border-t border-[#EAE4DC]">
          <button
            type="button"
            onClick={onCreateNew}
            className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-[#D5CEC2] hover:border-[#4F6D52] text-[#4F6D52] hover:bg-[#F2F7F2] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>+</span>
            <span>Create New User Account</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Onboarding / Account Creation View ─── */
function OnboardingScreen({
  onComplete,
  onSwitchToLogin,
  hasExistingAccounts,
}: {
  onComplete: (
    name: string,
    initialTodoTitle?: string,
    initialDeadline?: string,
    initialPriority?: Priority,
    initialCategory?: string,
    initialRecurrence?: Recurrence
  ) => void
  onSwitchToLogin?: () => void
  hasExistingAccounts?: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('')
  const [firstTodo, setFirstTodo] = useState('')
  const [deadline, setDeadline] = useState(getLocalDateString())
  const [priority, setPriority] = useState<Priority>('high')
  const [category, setCategory] = useState('Work')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')

  useEffect(() => {
    if (cardRef.current) {
      animateFadeSlideUp(cardRef.current, { translateY: 24, duration: 650 })
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onComplete(name.trim(), firstTodo.trim() || undefined, deadline, priority, category, recurrence)
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4 sm:p-6 text-[#2C2926] relative">
      <div className="ambient-orb-1 absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#EADCC9]/50 blur-3xl" />
      <div className="ambient-orb-2 absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-[#DFE7DD]/50 blur-3xl" />

      <div
        ref={cardRef}
        className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-[#E6E0D6] relative z-10 space-y-6"
      >
        {/* Brand Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#4F6D52] flex items-center justify-center text-white font-bold text-xl shadow-md shadow-[#4F6D52]/20">
            ✓
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-[#2C2926] font-bold leading-tight">
              Welcome to CraftPath
            </h1>
            <p className="text-xs text-[#7A746B] font-medium tracking-wide uppercase">
              Personal To-Do Studio & Daily Streaks
            </p>
          </div>
        </div>

        <p className="text-sm text-[#6B655B] leading-relaxed">
          Create your account to start posting to-dos, setting deadlines, and building your daily accomplishment streak. No password required!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Name */}
          <div>
            <label className="text-xs font-bold text-[#544F47] uppercase tracking-wider block mb-1.5">
              What is your name? <span className="text-[#CC8F3F]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mark, Alex, Sarah..."
              className="w-full bg-[#FAF7F2] border border-[#E2DDD5] focus:border-[#4F6D52] rounded-xl p-3.5 text-base text-[#2C2926] focus:outline-none transition-colors"
            />
          </div>

          {/* First Objective (Optional) */}
          <div>
            <label className="text-xs font-bold text-[#544F47] uppercase tracking-wider block mb-1.5">
              What’s your first objective or to-do? (Optional)
            </label>
            <input
              type="text"
              value={firstTodo}
              onChange={(e) => setFirstTodo(e.target.value)}
              placeholder="e.g. Review project outline, draft weekly schedule..."
              className="w-full bg-[#FAF7F2] border border-[#E2DDD5] focus:border-[#4F6D52] rounded-xl p-3 text-sm text-[#2C2926] focus:outline-none transition-colors"
            />
          </div>

          {/* First To-do Deadline, Category & Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#544F47] block mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl p-2.5 text-xs text-[#2C2926] focus:outline-none focus:border-[#4F6D52]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#544F47] block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl p-2.5 text-xs text-[#2C2926] focus:outline-none focus:border-[#4F6D52]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#544F47] block mb-1">
                Repeat
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl p-2.5 text-xs text-[#2C2926] focus:outline-none focus:border-[#4F6D52]"
              >
                <option value="none">Once</option>
                <option value="daily">🔁 Everyday</option>
                <option value="weekdays">💼 Weekdays</option>
                <option value="weekly">🗓️ Weekly</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={!name.trim()}
              onClick={(e) => {
                if (name.trim()) {
                  triggerCelebration()
                  animateJelly(e.currentTarget)
                }
              }}
              className="w-full bg-[#4F6D52] hover:bg-[#3E5741] disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl text-sm shadow-md shadow-[#4F6D52]/20 transition-all cursor-pointer active:scale-95"
            >
              Create Account & Enter Studio ✨
            </button>
          </div>

          {/* Switch back to login if accounts exist */}
          {hasExistingAccounts && onSwitchToLogin && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-xs text-[#4F6D52] hover:underline font-semibold transition-colors cursor-pointer"
              >
                ← Back to account selection
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

/* ─── Task Card Component ─── */
function TaskCard({
  todo,
  onToggle,
  onEdit,
  onDelete,
  onReschedule,
  onKickstart,
  onDeconstruct,
  formatFriendlyDate,
  isOverdue = false,
  isToday = false,
  isCompleted = false,
}: {
  todo: TodoItem
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void
  onEdit: () => void
  onDelete: () => void
  onReschedule?: (newDeadline: string) => void
  onKickstart?: () => void
  onDeconstruct?: () => void
  formatFriendlyDate: (d: string) => string
  isOverdue?: boolean
  isToday?: boolean
  isCompleted?: boolean
}) {
  const cat = getCategoryMeta(todo.category)
  const priority = getPriorityBadge(todo.priority)
  const recMeta = getRecurrenceMeta(todo.recurrence)

  return (
    <TiltCard
      className={`group rounded-2xl border transition-all duration-200 ${
        isCompleted
          ? 'bg-white/60 border-[#E8E4DC] opacity-75'
          : isOverdue
          ? 'bg-[#FFFAF9] border-[#F5D5D0] shadow-xs'
          : isToday
          ? 'bg-white border-[#DED7CC] shadow-xs hover:border-[#4F6D52]/50'
          : 'bg-white border-[#E6E0D6] hover:border-[#CC8F3F]/40'
      }`}
    >
      <div className="p-4 sm:p-5 flex items-start justify-between gap-3 sm:gap-4">
        {/* Checkbox Button */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
            todo.done
              ? 'bg-[#4F6D52] border-[#4F6D52] text-white shadow-xs'
              : 'border-[#B8B1A5] hover:border-[#4F6D52] bg-white'
          }`}
          title={todo.done ? 'Mark uncompleted' : 'Mark completed to build streak'}
        >
          {todo.done && <span className="text-xs font-bold leading-none">✓</span>}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Chip */}
            <span
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1 border"
              style={{ backgroundColor: cat.bg, borderColor: cat.border, color: cat.color }}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </span>

            {/* Recurrence Chip (if recurring) */}
            {recMeta && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border"
                style={{
                  backgroundColor: recMeta.bg,
                  borderColor: recMeta.border,
                  color: recMeta.color,
                }}
                title={recMeta.desc}
              >
                <span>{recMeta.icon}</span>
                <span>{recMeta.label}</span>
              </span>
            )}

            {/* Priority Chip */}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border"
              style={{ backgroundColor: priority.bg, borderColor: priority.border, color: priority.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priority.dot }} />
              <span>{priority.label}</span>
            </span>

            {/* Deadline Chip */}
            {todo.deadline && (
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1 border ${
                  isOverdue && !todo.done
                    ? 'bg-[#FDF2F0] border-[#F2C8C2] text-[#B24C38] font-bold'
                    : isToday && !todo.done
                    ? 'bg-[#F9F4EC] border-[#EEDFCA] text-[#9E621F] font-semibold'
                    : 'bg-[#F5F4F0] border-[#E5E2DA] text-[#6E685F]'
                }`}
              >
                <span>📅</span>
                <span>{formatFriendlyDate(todo.deadline)}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className={`text-sm sm:text-base font-semibold tracking-tight transition-all leading-snug ${
              todo.done ? 'line-through text-[#8F8A80]' : 'text-[#2C2926]'
            }`}
          >
            {todo.title}
          </h3>

          {/* Description (if any) */}
          {todo.description && (
            <p
              className={`text-xs leading-relaxed line-clamp-2 ${
                todo.done ? 'line-through text-[#A6A095]' : 'text-[#6B655B]'
              }`}
            >
              {todo.description}
            </p>
          )}

          {/* Completed Timestamp (if done) */}
          {todo.done && todo.completedAt && (
            <p className="text-[10px] text-[#4F6D52] font-medium pt-0.5">
              ✓ Completed on{' '}
              {new Date(todo.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

          {/* Action Buttons & Quick Postpone */}
        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {!todo.done && (
            <div className="flex items-center gap-1">
              {onKickstart && (
                <button
                  type="button"
                  onClick={onKickstart}
                  className="px-2 py-1 bg-[#FAF5EB] hover:bg-[#F4E8D3] text-[#9E5D1E] border border-[#E8CBA5] rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-0.5 shadow-2xs"
                  title="Roast my procrastination & give me a 5-minute starter action"
                >
                  <span>🥊</span>
                  <span className="hidden lg:inline">Kickstart</span>
                </button>
              )}
              {onDeconstruct && (
                <button
                  type="button"
                  onClick={onDeconstruct}
                  className="p-1 bg-[#F5F4F0] hover:bg-[#EAE5DC] text-[#6B655B] border border-[#E2DDD5] rounded-lg text-xs transition-all cursor-pointer"
                  title="Deconstruct goal into subtasks with AI"
                >
                  🪄
                </button>
              )}
            </div>
          )}

          {!todo.done && onReschedule && (
            <div className="flex items-center gap-1 bg-[#F5F2EC] rounded-xl p-0.5 border border-[#EAE4DC]">
              <button
                type="button"
                onClick={() => onReschedule(getTomorrowString())}
                className="px-2 py-1 text-[10px] font-semibold text-[#6B655B] hover:text-[#4F6D52] hover:bg-white rounded-lg transition-all cursor-pointer whitespace-nowrap"
                title="Postpone to Tomorrow (+1 day)"
              >
                +1d
              </button>
              <button
                type="button"
                onClick={() => onReschedule(getDaysAheadString(3))}
                className="px-2 py-1 text-[10px] font-semibold text-[#6B655B] hover:text-[#4F6D52] hover:bg-white rounded-lg transition-all cursor-pointer whitespace-nowrap"
                title="Reschedule in 3 days"
              >
                +3d
              </button>
              <button
                type="button"
                onClick={() => onReschedule(getDaysAheadString(7))}
                className="px-2 py-1 text-[10px] font-semibold text-[#6B655B] hover:text-[#4F6D52] hover:bg-white rounded-lg transition-all cursor-pointer whitespace-nowrap hidden sm:inline"
                title="Reschedule next week (+7 days)"
              >
                +7d
              </button>
              <div className="relative inline-flex items-center">
                <span
                  className="px-1.5 py-1 text-[10px] text-[#6B655B] hover:text-[#4F6D52] hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="Pick specific date to reschedule"
                >
                  📅
                </span>
                <input
                  type="date"
                  onChange={(e) => e.target.value && onReschedule(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Pick specific date"
                />
              </div>
            </div>
          )}

          <button
            onClick={onEdit}
            className="p-1.5 text-[#8F8A80] hover:text-[#2C2926] hover:bg-[#F2EFEB] rounded-lg transition-all cursor-pointer text-xs"
            title="Edit task"
          >
            ✎
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-[#8F8A80] hover:text-[#B24C38] hover:bg-[#FDF2F0] rounded-lg transition-all cursor-pointer text-xs"
            title="Delete task"
          >
            🗑
          </button>
        </div>
      </div>
    </TiltCard>
  )
}


/* ─── Task Modal Component (Create & Edit) ─── */
function TaskModal({
  todo,
  onClose,
  onSave,
}: {
  todo: TodoItem | null
  onClose: () => void
  onSave: (data: {
    title: string
    description?: string
    deadline: string
    category: string
    priority: Priority
    recurrence: Recurrence
  }) => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState(todo?.title || '')
  const [description, setDescription] = useState(todo?.description || '')
  const [deadline, setDeadline] = useState(todo?.deadline || getLocalDateString())
  const [category, setCategory] = useState(todo?.category || 'Work')
  const [priority, setPriority] = useState<Priority>(todo?.priority || 'medium')
  const [recurrence, setRecurrence] = useState<Recurrence>(todo?.recurrence || 'none')

  useEffect(() => {
    if (modalRef.current) {
      animateModalIn(modalRef.current)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      deadline,
      category,
      priority,
      recurrence,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2926]/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-3xl border border-[#E6E0D6] shadow-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-4">
          <h2 className="font-display text-xl font-bold text-[#2C2926]">
            {todo ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F2EC] hover:bg-[#EAE5DC] text-[#6B655B] flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#544F47] mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to accomplish?"
              className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-sm text-[#2C2926] placeholder-[#9C968B] focus:outline-none focus:border-[#4F6D52] focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#544F47] mb-1.5">
              Notes & Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key context, links, or sub-details..."
              className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-sm text-[#2C2926] placeholder-[#9C968B] focus:outline-none focus:border-[#4F6D52] focus:bg-white resize-none"
            />
          </div>

          {/* Grid: Deadline & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Deadline */}
            <div>
              <label className="block text-xs font-semibold text-[#544F47] mb-1.5">
                Deadline Date
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3.5 py-2 text-sm text-[#2C2926] focus:outline-none focus:border-[#4F6D52] focus:bg-white cursor-pointer"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-[#544F47] mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3.5 py-2 text-sm text-[#2C2926] focus:outline-none focus:border-[#4F6D52] focus:bg-white cursor-pointer"
              >
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">🟢 Low Priority</option>
              </select>
            </div>
          </div>

          {/* Repeat / Recurrence */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#544F47]">
                Repeat / Recurrence
              </label>
              <span className="text-[11px] text-[#8F8A80]">
                Auto-schedules next occurrence on completion
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'none', label: 'Once', icon: '⚡', desc: 'No repeat' },
                { id: 'daily', label: 'Everyday', icon: '🔁', desc: 'Daily routine' },
                { id: 'weekdays', label: 'Weekdays', icon: '💼', desc: 'Mon - Fri' },
                { id: 'weekly', label: 'Weekly', icon: '🗓️', desc: 'Every week' },
              ].map((rec) => {
                const isSelected = recurrence === rec.id
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setRecurrence(rec.id as Recurrence)
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFF6F0] border-[#4F6D52] shadow-xs'
                        : 'bg-[#FAF7F2] border-[#E2DDD5] hover:border-[#4F6D52]/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{rec.icon}</span>
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#4F6D52]' : 'text-[#2C2926]'
                        }`}
                      >
                        {rec.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8F8A80] mt-0.5">{rec.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[#544F47] mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const isSelected = category.toLowerCase() === c.name.toLowerCase()
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCategory(c.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#4F6D52] bg-[#4F6D52] text-white shadow-xs'
                        : 'bg-[#FAF7F2] border-[#E2DDD5] text-[#544F47] hover:border-[#4F6D52]'
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE4DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B655B] hover:bg-[#F2EFEB] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#4F6D52] hover:bg-[#3E5741] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
            >
              {todo ? 'Save Changes' : 'Create To-Do'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Streak & Habits Modal ─── */
function StreakModal({
  streakCount,
  lastCompletedDate,
  streakHistory,
  onClose,
}: {
  streakCount: number
  lastCompletedDate: string | null
  streakHistory: string[]
  onClose: () => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const today = getLocalDateString()
  const isDoneToday = streakHistory.includes(today)

  useEffect(() => {
    if (modalRef.current) {
      animateModalIn(modalRef.current)
    }
  }, [])

  // Last 7 days preview
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const last7Days = useMemo(() => {
    const list = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = getLocalDateString(d)
      const dayName = daysOfWeek[d.getDay()]
      const isCompleted = streakHistory.includes(dateStr)
      list.push({ dateStr, dayName, isCompleted, isToday: dateStr === today })
    }
    return list
  }, [streakHistory, today])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2926]/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-3xl border border-[#E6E0D6] shadow-2xl p-6 sm:p-8 space-y-6 text-center"
      >
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F2EC] hover:bg-[#EAE5DC] text-[#6B655B] flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Big Flame Icon */}
        <div className="space-y-3">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#FFF4E6] to-[#FFE0B2] border border-[#FFD180] flex items-center justify-center shadow-lg shadow-[#CC8F3F]/15">
            <span className="text-4xl streak-pulse">🔥</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-[#2C2926]">
            {streakCount} Day Streak!
          </h2>

          <p className="text-sm text-[#6B655B] max-w-xs mx-auto leading-relaxed">
            {isDoneToday
              ? '🔥 You have completed at least one task today! Your streak is secured for today.'
              : '⚡ Complete at least one task today to keep your daily streak alive and growing.'}
          </p>
        </div>

        {/* 7-Day Activity Ring */}
        <div className="bg-[#FAF7F2] border border-[#EAE4DC] p-4 rounded-2xl space-y-2">
          <span className="text-xs font-semibold text-[#544F47] block">
            Last 7 Days Activity
          </span>
          <div className="flex items-center justify-around pt-1">
            {last7Days.map((day) => (
              <div key={day.dateStr} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    day.isCompleted
                      ? 'bg-[#4F6D52] text-white shadow-xs'
                      : day.isToday
                      ? 'border-2 border-dashed border-[#CC8F3F] text-[#CC8F3F] bg-white'
                      : 'bg-[#EAE5DC] text-[#8F8A80]'
                  }`}
                >
                  {day.isCompleted ? '✓' : day.isToday ? '🔥' : '·'}
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    day.isToday ? 'text-[#4F6D52] font-bold' : 'text-[#8F8A80]'
                  }`}
                >
                  {day.dayName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rules Card */}
        <div className="text-left bg-[#FDFBF7] border border-[#EBE4D8] p-4 rounded-2xl space-y-1.5 text-xs text-[#6B655B]">
          <p className="font-semibold text-[#2C2926]">How the Streak Works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check off any scheduled to-do on that day to secure your streak.</li>
            <li>Completing multiple tasks maintains and enriches your daily record.</li>
            <li>Missed days reset your active streak count.</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#4F6D52] hover:bg-[#3E5741] text-white text-xs font-semibold py-3 rounded-xl shadow-md cursor-pointer transition-all"
        >
          Got It, Let’s Do This!
        </button>
      </div>
    </div>
  )
}

/* ─── Profile & Customization Modal ─── */
function ProfileModal({
  currentUser,
  accounts,
  onClose,
  onUpdateName,
  onCreateAccount,
  onSwitchAccount,
  onLogout,
  onReset,
}: {
  currentUser: any
  accounts: any[]
  onClose: () => void
  onUpdateName: (name: string) => void
  onCreateAccount: (name: string) => void
  onSwitchAccount: (id: string) => void
  onLogout: () => void
  onReset: () => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [nameInput, setNameInput] = useState(currentUser?.name || '')
  const [isCreating, setIsCreating] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')

  useEffect(() => {
    if (modalRef.current) {
      animateModalIn(modalRef.current)
    }
  }, [])

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    onUpdateName(nameInput.trim())
    onClose()
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccountName.trim()) return
    onCreateAccount(newAccountName.trim())
    setIsCreating(false)
    setNewAccountName('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2926]/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-3xl border border-[#E6E0D6] shadow-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-4">
          <h2 className="font-display text-xl font-bold text-[#2C2926]">
            Profile & Accounts
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F2EC] hover:bg-[#EAE5DC] text-[#6B655B] flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Change Display Name */}
        <form onSubmit={handleSaveName} className="space-y-3">
          <label className="block text-xs font-semibold text-[#544F47]">
            Your Name (used in the daily greeting)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              className="flex-1 bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3.5 py-2 text-sm text-[#2C2926] focus:outline-none focus:border-[#4F6D52] focus:bg-white"
            />
            <button
              type="submit"
              className="bg-[#4F6D52] text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer hover:bg-[#3E5741] transition-all"
            >
              Update
            </button>
          </div>
          <p className="text-[11px] text-[#8F8A80]">
            The app will greet you with: <em>"Hey {nameInput || '...'}, here's what you are going to accomplish today."</em>
          </p>
        </form>

        {/* Switch / Create Accounts */}
        <div className="space-y-3 pt-4 border-t border-[#EAE4DC]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#544F47]">Switch Accounts (No Password)</span>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="text-xs text-[#4F6D52] font-semibold hover:underline cursor-pointer"
            >
              {isCreating ? 'Cancel' : '+ New Account'}
            </button>
          </div>

          {isCreating ? (
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="New user name..."
                className="flex-1 bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3 py-1.5 text-xs text-[#2C2926] focus:outline-none focus:border-[#4F6D52]"
              />
              <button
                type="submit"
                className="bg-[#CC8F3F] text-white text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer hover:bg-[#B87B2E]"
              >
                Create
              </button>
            </form>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {accounts.map((acc) => {
                const isActive = currentUser?.id === acc.id
                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      onSwitchAccount(acc.id)
                      onClose()
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#F2F7F2] border-[#CFE0D1] font-bold text-[#4F6D52]'
                        : 'bg-[#FAF7F2] border-[#EAE5DC] text-[#544F47] hover:border-[#BDB5A7]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                        style={{ backgroundColor: acc.avatarColor }}
                      >
                        {acc.name?.[0]?.toUpperCase()}
                      </div>
                      <span>{acc.name}</span>
                    </div>
                    {isActive ? <span>Active ✓</span> : <span>Switch ➔</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Sign Out & Reset */}
        <div className="pt-4 border-t border-[#EAE4DC] flex items-center justify-between">
          <button
            onClick={() => {
              onLogout()
              onClose()
            }}
            className="text-xs font-semibold text-[#B24C38] hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <span>Sign Out</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reset all tasks and data?')) {
                onReset()
                onClose()
              }
            }}
            className="text-[11px] text-[#8F8A80] hover:text-[#B24C38] hover:underline cursor-pointer"
          >
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Daily Email Reminder & Digest Modal ─── */
function EmailDigestModal({
  currentUser,
  emailReminder,
  todos,
  todayTodos,
  overdueTodos,
  dailyRoast,
  streakCount,
  onClose,
  onSave,
}: {
  currentUser: UserAccount | null
  emailReminder: any
  todos: TodoItem[]
  todayTodos: TodoItem[]
  overdueTodos: TodoItem[]
  dailyRoast?: string
  streakCount: number
  onClose: () => void
  onSave: (settings: any) => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState(emailReminder?.email || '')
  const [enabled, setEnabled] = useState(emailReminder?.enabled ?? true)
  const [time, setTime] = useState(emailReminder?.time || '08:00')
  const [frequency, setFrequency] = useState<'daily' | 'weekdays'>(emailReminder?.frequency || 'daily')
  const [isSending, setIsSending] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<EmailDispatchResult | null>(null)

  useEffect(() => {
    if (modalRef.current) {
      animateModalIn(modalRef.current)
    }
  }, [])

  const today = getLocalDateString()
  const todayTasks = todayTodos || (todos || []).filter((t) => !t.done && t.deadline?.split('T')[0] === today)
  const overdueTasks = overdueTodos || []

  const handleSendTest = async () => {
    if (!email.trim()) return
    setIsSending(true)
    setDispatchResult(null)
    playClickSound()

    try {
      const res = await sendEmailBriefing(
        email.trim(),
        currentUser?.name || 'Maker',
        today,
        streakCount,
        todayTasks,
        overdueTasks,
        dailyRoast
      )
      setDispatchResult(res)
      if (res.success) {
        playTaskCompleteSound()
      }
    } catch (err: any) {
      setDispatchResult({
        success: false,
        message: err.message || 'Failed to send email briefing.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const mailtoLink = getMailtoLink(
    email.trim() || 'your-email@example.com',
    currentUser?.name || 'Maker',
    today,
    streakCount,
    todayTasks,
    overdueTasks,
    dailyRoast
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    playClickSound()
    onSave({
      email: email.trim(),
      enabled,
      time,
      frequency,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2926]/40 backdrop-blur-xs">
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-white rounded-3xl border border-[#E6E0D6] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✉️</span>
            <div>
              <h2 className="font-display text-xl font-bold text-[#2C2926]">
                Daily Task Email Briefing
              </h2>
              <p className="text-xs text-[#7A746B]">
                Receive your daily to-dos delivered directly to your inbox every morning
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

        <form onSubmit={handleSave} className="space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-[#544F47] mb-1.5">
              Your Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@example.com"
              className="w-full bg-[#FAF7F2] border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-sm text-[#2C2926] focus:outline-none focus:border-[#4F6D52] focus:bg-white"
            />
          </div>

          {/* Controls: Enabled, Time, Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Enabled */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E2DDD5]">
              <span className="text-xs font-semibold text-[#544F47]">Daily Status</span>
              <label className="inline-flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded text-[#4F6D52] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-medium text-[#2C2926]">
                  {enabled ? 'Active ☀️' : 'Paused ⏸️'}
                </span>
              </label>
            </div>

            {/* Time */}
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E2DDD5]">
              <span className="text-xs font-semibold text-[#544F47] block mb-1.5">Delivery Time</span>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-transparent text-xs text-[#2C2926] focus:outline-none cursor-pointer"
              >
                <option value="07:00">7:00 AM (Early)</option>
                <option value="08:00">8:00 AM (Recommended)</option>
                <option value="09:00">9:00 AM (Morning)</option>
                <option value="12:00">12:00 PM (Noon)</option>
              </select>
            </div>

            {/* Frequency */}
            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E2DDD5]">
              <span className="text-xs font-semibold text-[#544F47] block mb-1.5">Frequency</span>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full bg-transparent text-xs text-[#2C2926] focus:outline-none cursor-pointer"
              >
                <option value="daily">Every Day</option>
                <option value="weekdays">Weekdays Only</option>
              </select>
            </div>
          </div>

          {/* Live Email Preview Box */}
          <div className="rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-2 text-xs">
              <span className="font-semibold text-[#7A746B]">Email Preview</span>
              <span className="text-[#4F6D52] font-medium">To: {email || 'your-email@example.com'}</span>
            </div>

            <div className="bg-white rounded-xl border border-[#EDE8E0] p-4 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4F6D52] uppercase tracking-wider">
                  CraftPath Morning Briefing
                </span>
                <span className="text-xs font-bold text-[#CC8F3F]">🔥 {streakCount} Day Streak</span>
              </div>
              <h4 className="font-display text-base font-bold text-[#2C2926]">
                Hey {currentUser?.name || 'Maker'}, here’s what you are going to accomplish today!
              </h4>
              <p className="text-xs text-[#6B655B]">
                You have {todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'} scheduled for today:
              </p>

              <div className="space-y-1.5 pt-1">
                {todayTasks.length === 0 ? (
                  <p className="text-xs text-[#8F8A80] italic">No pending tasks for today. You're all clear!</p>
                ) : (
                  todayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 text-xs text-[#2C2926] bg-[#FAF7F2] px-2.5 py-1.5 rounded-lg border border-[#EAE4DC]"
                    >
                      <span>☐</span>
                      <span className="font-medium flex-1">{t.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#7A746B] border border-[#DDD7CC]">
                        {t.category}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Test Email & Open in Mail App Actions */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSending || !email.trim()}
                className="text-xs bg-[#4F6D52] hover:bg-[#3E5741] disabled:opacity-50 text-white font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>⚡</span>
                <span>{isSending ? 'Sending to Inbox...' : 'Send Briefing to My Email'}</span>
              </button>

              <a
                href={mailtoLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-[#FAF7F2] border border-[#E2DDD5] hover:border-[#CC8F3F] text-[#CC8F3F] font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>📬</span>
                <span>Open in Mail App (Gmail / Outlook)</span>
              </a>
            </div>

            {/* Status Notifications */}
            {dispatchResult && (
              <div className="transition-all animate-fadeIn">
                {dispatchResult.needsActivation ? (
                  <div className="bg-[#FFF9E6] border border-[#FFE082] rounded-xl p-3.5 text-xs text-[#8A6D3B] space-y-1.5 leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5 text-sm text-[#70521F]">
                      <span>📬</span>
                      <span>Action Required: Activate Your Email</span>
                    </p>
                    <p>
                      FormSubmit sent a confirmation link to <strong>{email}</strong>. Open your email and click <strong>"Activate Form"</strong> once.
                    </p>
                    <p className="text-[11px] text-[#8F743E]">
                      💡 <em>Tip: Check your Spam/Junk folder if it doesn't appear in 1 minute. Once clicked, all future daily briefings will arrive automatically!</em>
                    </p>
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={handleSendTest}
                        disabled={isSending}
                        className="bg-[#CC8F3F] hover:bg-[#B87B2E] disabled:opacity-50 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
                      >
                        <span>🚀</span>
                        <span>{isSending ? 'Sending...' : "I've Clicked Activate — Send My Briefing Now!"}</span>
                      </button>
                    </div>
                  </div>
                ) : dispatchResult.success ? (
                  <div className="bg-[#EBF5EE] border border-[#C2E0C8] rounded-xl p-3 text-xs text-[#355E3B] font-semibold flex items-center gap-2">
                    <span>✓</span>
                    <span>Briefing dispatched to {email}! Check your inbox now.</span>
                  </div>
                ) : (
                  <div className="bg-[#FDE8E8] border border-[#F8B4B4] rounded-xl p-3 text-xs text-[#9B1C1C]">
                    <span>⚠️ {dispatchResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
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
              Save Email Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App

