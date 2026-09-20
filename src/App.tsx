import { useState, useEffect } from 'react'
import { useStore } from './store'
import { Screen, Tab, Nav, Hobby, Milestone, PracticeSession } from './types'

/* ─── Color Tokens ─── */
const SAGE = '#6E8B6B'
const AMBER = '#CC8F3F'
const SLATE = '#5B6B77'

/* ─── Curated Explore Crafts ─── */
const EXPLORE_CRAFTS = [
  {
    id: 'exp-1',
    name: 'Ceramic Pottery',
    category: 'Crafts & Sculpting',
    color: '#B26E53',
    bg: '#FAF0EB',
    difficulty: 'Intermediate',
    hoursToBasics: '30-40 hours',
    desc: 'Master the potter’s wheel, centering clay, pulling even walls, and dipping glazed bisqueware.',
    starterKit: 'Pottery wheel access, stoneware clay, wire cutter, rib tool, sponge',
    initialMilestone: 'Throw 5 matching cylinders with 1/4" wall thickness',
  },
  {
    id: 'exp-2',
    name: 'Bonsai Cultivation',
    category: 'Living Arts',
    color: '#4F7959',
    bg: '#EAF3EC',
    difficulty: 'Beginner Friendly',
    hoursToBasics: '15-20 hours',
    desc: 'The ancient art of cultivating miniature trees through directional pruning, structural wiring, and aesthetic balance.',
    starterKit: 'Juniper or Ficus bonsai, concave branch cutter, aluminum training wire, inorganic soil mix',
    initialMilestone: 'Complete primary structural wiring and first repotting pass',
  },
  {
    id: 'exp-3',
    name: 'Leathercraft & Goods',
    category: 'Tactile Crafts',
    color: '#9C6644',
    bg: '#F7EFE9',
    difficulty: 'Intermediate',
    hoursToBasics: '35-50 hours',
    desc: 'Hand-craft heirloom leather goods using vegetable-tanned hides, pricking irons, and saddle stitching.',
    starterKit: 'Veg-tan leather remnants, diamond pricking irons, waxed poly thread, harness needles, beveler',
    initialMilestone: 'Craft a 4-pocket minimalist cardholder with burnished edges',
  },
  {
    id: 'exp-4',
    name: 'Sourdough & Fermentation',
    category: 'Culinary Arts',
    color: '#C68B45',
    bg: '#FBF3E8',
    difficulty: 'Beginner',
    hoursToBasics: '20 hours',
    desc: 'Cultivate a wild yeast starter, master baker’s percentages, coil folds, fermentation timing, and Dutch oven steam baking.',
    starterKit: 'Sourdough starter culture, kitchen scale, banneton proofing basket, lame/razor, cast iron Dutch oven',
    initialMilestone: 'Bake a classic country loaf with open crumb and blistered crust',
  },
  {
    id: 'exp-5',
    name: 'Copperplate Calligraphy',
    category: 'Visual Arts',
    color: '#655A75',
    bg: '#F2EFF6',
    difficulty: 'Beginner',
    hoursToBasics: '25 hours',
    desc: 'Traditional pointed-pen cursive script focusing on pressure modulation, rhythmic hairlines, and elegant flourishing.',
    starterKit: 'Oblique pen holder, Nikko G or Hunt 101 nib, walnut ink, Rhodia dot-pad',
    initialMilestone: 'Complete full lowercase alphabet drills with consistent 55° slant',
  },
  {
    id: 'exp-6',
    name: 'Analog 35mm Photography',
    category: 'Visual Arts',
    color: '#476877',
    bg: '#ECF2F5',
    difficulty: 'Beginner Friendly',
    hoursToBasics: '30 hours',
    desc: 'Manual exposure triangle, light metering, intentional frame composition, and monochrome film developing.',
    starterKit: 'Vintage manual SLR (e.g. Canon AE-1 or Pentax K1000), 50mm f/1.8 lens, B&W film roll',
    initialMilestone: 'Shoot and develop a 36-exposure architectural study roll',
  },
]

/* ─── Shared Checkbox Component ─── */
function Checkbox({ checked, color, onToggle }: { checked: boolean; color: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="shrink-0 p-0 bg-transparent border-none cursor-pointer flex items-center justify-center transition-transform active:scale-95"
      aria-label="Toggle checkpoint"
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: `2px solid ${checked ? color : '#CEC8BF'}`,
          backgroundColor: checked ? color : 'transparent',
        }}
        className="flex items-center justify-center transition-all duration-150"
      >
        {checked && (
          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
            <path d="M1 3.5L4 6.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  )
}

/* ─── Onboarding / Account Creation View ─── */
function OnboardingScreen({
  onComplete,
}: {
  onComplete: (name: string, hobby: string, category: string, milestone: string) => void
}) {
  const [name, setName] = useState('')
  const [hobby, setHobby] = useState('')
  const [category, setCategory] = useState('Visual Arts')
  const [milestone, setMilestone] = useState('')

  const popularHobbies = [
    { name: 'Watercolor Painting', category: 'Visual Arts' },
    { name: 'Fingerstyle Guitar', category: 'Music' },
    { name: '3D Sculpting', category: 'Digital Arts' },
    { name: 'Ceramic Pottery', category: 'Crafts' },
    { name: 'Woodworking', category: 'Makers' },
    { name: 'Sourdough Baking', category: 'Culinary' },
    { name: 'Bonsai Care', category: 'Living Arts' },
    { name: 'Calligraphy', category: 'Visual Arts' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onComplete(name.trim(), hobby.trim(), category, milestone.trim())
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center p-6 font-sans text-[#1E1C19]">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-[#EAE4DC]">
        {/* Brand Badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#6E8B6B] flex items-center justify-center text-white shadow-sm shadow-[#6E8B6B]/30">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-3xl text-[#1E1C19] font-normal leading-tight">
              Welcome to CraftPath
            </h1>
            <p className="text-xs text-[#8F8A80] font-medium tracking-wide uppercase">Your Personal Hobby & Mastery Studio</p>
          </div>
        </div>

        <p className="text-sm text-[#6C675E] leading-relaxed mb-8">
          Start fresh with a clean slate. Set up your personal studio account to track practice time, celebrate daily consistency, and reach milestones.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Name */}
          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">
              What is your name? <span className="text-[#CC8F3F]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mark, Alex, Sarah..."
              className="w-full bg-[#FAF7F2] border border-[#EAE4DC] focus:border-[#6E8B6B] rounded-2xl p-4 text-base text-[#1E1C19] focus:outline-none transition-colors"
            />
          </div>

          {/* Primary Craft */}
          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">
              What craft or hobby would you like to start with?
            </label>
            <input
              type="text"
              value={hobby}
              onChange={(e) => setHobby(e.target.value)}
              placeholder="Choose below or type your custom craft..."
              className="w-full bg-[#FAF7F2] border border-[#EAE4DC] focus:border-[#6E8B6B] rounded-2xl p-3.5 text-sm text-[#1E1C19] focus:outline-none transition-colors mb-3"
            />

            {/* Popular pills */}
            <div className="flex gap-2 flex-wrap">
              {popularHobbies.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => {
                    setHobby(item.name)
                    setCategory(item.category)
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    hobby === item.name
                      ? 'bg-[#1E1C19] text-white shadow-sm'
                      : 'bg-[#FAF7F2] text-[#6C675E] hover:bg-[#EEE9E0] border border-[#EAE4DC]'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Milestone (Optional) */}
          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">
              First Goal or Milestone (Optional)
            </label>
            <input
              type="text"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="e.g. Complete first 5 study sketches, learn basic chords..."
              className="w-full bg-[#FAF7F2] border border-[#EAE4DC] focus:border-[#6E8B6B] rounded-2xl p-3.5 text-sm text-[#1E1C19] focus:outline-none transition-colors"
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-[#6E8B6B] hover:bg-[#5E795B] disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl text-base shadow-md shadow-[#6E8B6B]/30 transition-all cursor-pointer active:scale-98"
            >
              Create Account & Enter Studio ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Top Web Navbar ─── */
function WebNavbar({
  active,
  onChange,
  onOpenLogModal,
  onOpenAccountModal,
}: {
  active: Nav
  onChange: (n: Nav) => void
  onOpenLogModal: () => void
  onOpenAccountModal: () => void
}) {
  const { streakCount, currentUser } = useStore()
  const navItems: { id: Nav; label: string; icon: string }[] = [
    { id: 'hobbies', label: 'Dashboard', icon: '🎨' },
    { id: 'explore', label: 'Explore Crafts', icon: '🧭' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ]

  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EAE4DC]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onChange('hobbies')}>
          <div className="w-10 h-10 rounded-xl bg-[#6E8B6B] flex items-center justify-center text-white shadow-sm shadow-[#6E8B6B]/30">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div>
            <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal tracking-tight block leading-tight">
              CraftPath
            </span>
            <span className="text-[11px] font-medium text-[#8F8A80] tracking-wider uppercase">
              Hobby & Mastery Studio
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="hidden md:flex items-center gap-1 bg-[#EEE9E0] p-1.5 rounded-full border border-[#E4DDD2]">
          {navItems.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? 'bg-white text-[#1E1C19] shadow-sm font-semibold'
                    : 'text-[#6C675E] hover:text-[#1E1C19] hover:bg-white/40'
                }`}
              >
                <span className="text-xs">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Right utility items */}
        <div className="flex items-center gap-3">
          {/* Streak pill */}
          <div className="flex items-center gap-2 bg-[#6E8B6B]/12 text-[#516E4E] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#6E8B6B]/20">
            <span className="text-base leading-none">🔥</span>
            <span>{streakCount}-day streak</span>
          </div>

          {/* Log Session Action Button */}
          <button
            onClick={onOpenLogModal}
            className="flex items-center gap-2 bg-[#6E8B6B] hover:bg-[#5E795B] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-[#6E8B6B]/30 transition-all duration-150 active:scale-98 cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Log Session</span>
          </button>

          {/* User profile avatar & switcher */}
          <button
            onClick={onOpenAccountModal}
            style={{ backgroundColor: currentUser?.avatarColor || '#CC8F3F' }}
            className="w-10 h-10 rounded-xl text-white font-semibold flex items-center justify-center text-sm shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
            title={`${currentUser?.name || 'Account'} — Click to manage accounts`}
          >
            {userInitial}
          </button>
        </div>
      </div>
    </header>
  )
}

/* ─── Dashboard Screen Content (PC Ratio - Clean Slate / New User) ─── */
function DashboardContent({
  onSelectHobbyDetail,
  onOpenLogModal,
  onOpenAddMilestoneModal,
  onOpenAddHobbyModal,
}: {
  onSelectHobbyDetail: (h: Hobby) => void
  onOpenLogModal: () => void
  onOpenAddMilestoneModal: () => void
  onOpenAddHobbyModal: () => void
}) {
  const { hobbies, milestones, sessions, streakCount, currentUser, toggleCheckpoint } = useStore()
  const [selectedHobbyFilter, setSelectedHobbyFilter] = useState<string>('all')

  const totalHours = hobbies.reduce((sum, h) => sum + h.hours, 0)
  const totalSessions = hobbies.reduce((sum, h) => sum + h.sessions, 0)
  const totalMilestonesCount = milestones.length

  const filteredMilestones = selectedHobbyFilter === 'all'
    ? milestones
    : milestones.filter((m) => m.hobbyId === selectedHobbyFilter)

  // Dynamic greeting based on current local time
  const currentHour = new Date().getHours()
  const greetingTime = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'
  const userName = currentUser?.name || 'Crafter'

  return (
    <div className="space-y-8">
      {/* Welcome Banner & Overview Metric Cards */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAE4DC] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF4EE] text-[#516E4E] uppercase tracking-wide">
              Daily Practice Dashboard
            </span>
            <span className="text-xs text-[#9B9890]">·</span>
            <span className="text-xs text-[#9B9890]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-4xl text-[#1E1C19] font-normal tracking-tight">
            {greetingTime}, {userName}
          </h1>
          <p className="text-[#6C675E] text-sm mt-2 leading-relaxed">
            Welcome to your creative space. Track your focused hours, achieve meaningful milestones, and cultivate deep craft mastery.
          </p>
        </div>

        {/* 4 PC Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#ECE5DC] min-w-[120px]">
            <p className="text-[11px] font-semibold text-[#8F8A80] uppercase tracking-wider">Total Time</p>
            <p className="text-2xl font-bold text-[#1E1C19] mt-1">{Math.round(totalHours)}h</p>
            <p className="text-[11px] text-[#516E4E] font-medium mt-0.5">Across all crafts</p>
          </div>
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#ECE5DC] min-w-[120px]">
            <p className="text-[11px] font-semibold text-[#8F8A80] uppercase tracking-wider">Sessions</p>
            <p className="text-2xl font-bold text-[#1E1C19] mt-1">{totalSessions}</p>
            <p className="text-[11px] text-[#8F8A80] font-medium mt-0.5">Completed</p>
          </div>
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#ECE5DC] min-w-[120px]">
            <p className="text-[11px] font-semibold text-[#8F8A80] uppercase tracking-wider">Streak</p>
            <p className="text-2xl font-bold text-[#CC8F3F] mt-1">{streakCount}d</p>
            <p className="text-[11px] text-[#CC8F3F] font-medium mt-0.5">Day streak</p>
          </div>
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#ECE5DC] min-w-[120px]">
            <p className="text-[11px] font-semibold text-[#8F8A80] uppercase tracking-wider">Milestones</p>
            <p className="text-2xl font-bold text-[#6E8B6B] mt-1">{totalMilestonesCount}</p>
            <p className="text-[11px] text-[#516E4E] font-medium mt-0.5">In progress</p>
          </div>
        </div>
      </div>

      {/* Main Two-Column PC Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upcoming Milestones & Goals (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EAE4DC]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F0EBE3]">
              <div>
                <h2 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal">
                  Upcoming Milestones & Goals
                </h2>
                <p className="text-xs text-[#8F8A80] mt-1">
                  Check off items as you practice to advance your craft mastery.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAddMilestoneModal}
                  className="text-xs font-bold text-white bg-[#6E8B6B] hover:bg-[#5E795B] px-3.5 py-1.5 rounded-xl shadow-sm transition-all"
                >
                  + Add Goal
                </button>
              </div>
            </div>

            {/* Filter pills if multiple crafts exist */}
            {hobbies.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-4">
                <button
                  onClick={() => setSelectedHobbyFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    selectedHobbyFilter === 'all'
                      ? 'bg-[#1E1C19] text-white'
                      : 'bg-[#F4EFE6] text-[#6C675E] hover:bg-[#EAE4D9]'
                  }`}
                >
                  All Crafts
                </button>
                {hobbies.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHobbyFilter(h.id)}
                    style={{
                      backgroundColor: selectedHobbyFilter === h.id ? h.color : '#F4EFE6',
                      color: selectedHobbyFilter === h.id ? 'white' : '#6C675E',
                    }}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            )}

            {/* Milestones List or Empty State */}
            {filteredMilestones.length === 0 ? (
              <div className="text-center py-12 px-4 bg-[#FAF7F2] rounded-2xl border border-[#ECE5DC] mt-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EEE9E0] text-2xl flex items-center justify-center mx-auto mb-3">
                  🎯
                </div>
                <h3 className="text-base font-bold text-[#1E1C19]">No milestones created yet</h3>
                <p className="text-xs text-[#8F8A80] mt-1 max-w-sm mx-auto">
                  Milestones give your practice intention and direction. Create your first goal with checkpoints to track your progress!
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    onClick={onOpenAddMilestoneModal}
                    className="text-xs font-bold text-white bg-[#6E8B6B] hover:bg-[#5E795B] px-4 py-2 rounded-xl shadow-sm"
                  >
                    + Create First Milestone
                  </button>
                  {hobbies.length === 0 && (
                    <button
                      onClick={onOpenAddHobbyModal}
                      className="text-xs font-bold text-[#5A554D] bg-[#EEE9E0] hover:bg-[#E2DBD0] px-4 py-2 rounded-xl"
                    >
                      + Add a Craft
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#F4EFE6] mt-2">
                {filteredMilestones.map((m) => {
                  const hobby = hobbies.find((h) => h.id === m.hobbyId) || hobbies[0] || {
                    name: 'Craft',
                    color: '#6E8B6B',
                    bg: '#EFF4EE',
                  }
                  const doneCount = m.checkpoints.filter((cp) => cp.done).length
                  const totalCount = m.checkpoints.length
                  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

                  return (
                    <div key={m.id} className="py-5 first:pt-4 last:pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              style={{ backgroundColor: hobby.bg, color: hobby.color }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            >
                              {hobby.name}
                            </span>
                            <span className="text-xs text-[#8F8A80]">· Due {m.due}</span>
                          </div>
                          <h3 className="text-base font-semibold text-[#1E1C19] leading-snug">
                            {m.title}
                          </h3>
                        </div>

                        {hobbies.some((h) => h.id === m.hobbyId) && (
                          <button
                            onClick={() => onSelectHobbyDetail(hobby as Hobby)}
                            className="shrink-0 text-xs font-semibold text-[#6E8B6B] hover:text-[#5E795B] bg-[#EFF4EE] hover:bg-[#E3ECE2] px-3 py-1.5 rounded-lg transition-colors"
                          >
                            View Craft →
                          </button>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-[#EEE9E0] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%`, backgroundColor: hobby.color }}
                            className="h-full rounded-full transition-all duration-300"
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#8F8A80] shrink-0">
                          {doneCount}/{totalCount} ({pct}%)
                        </span>
                      </div>

                      {/* Interactive checkpoints */}
                      {m.checkpoints.length > 0 && (
                        <div className="mt-3.5 space-y-2 bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#ECE5DC]">
                          {m.checkpoints.map((cp) => (
                            <div
                              key={cp.id}
                              className="flex items-center gap-3 py-1 cursor-pointer select-none group"
                              onClick={() => toggleCheckpoint(m.id, cp.id)}
                            >
                              <Checkbox
                                checked={cp.done}
                                color={hobby.color}
                                onToggle={() => toggleCheckpoint(m.id, cp.id)}
                              />
                              <span
                                className={`text-sm transition-colors ${
                                  cp.done
                                    ? 'line-through text-[#9B9890]'
                                    : 'text-[#36322D] group-hover:text-[#1E1C19]'
                                }`}
                              >
                                {cp.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Practice Logger & Recent Journal (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Practice Shortcut */}
          <div className="bg-gradient-to-br from-[#6E8B6B] to-[#557352] rounded-3xl p-6 sm:p-7 text-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Quick Logger
              </span>
              <span className="text-xs text-white/80">Ready to practice?</span>
            </div>
            <h3 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-white font-normal">
              Record Today’s Session
            </h3>
            <p className="text-sm text-white/85 mt-1 leading-relaxed">
              Every minute spent with your craft deepens your intuitive feel and muscle memory.
            </p>
            <div className="mt-5">
              <button
                onClick={onOpenLogModal}
                className="w-full bg-white text-[#557352] hover:bg-[#F7F4EF] font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-sm text-center cursor-pointer"
              >
                + Log Practice Session
              </button>
            </div>
          </div>

          {/* Recent Practice Journal */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-[#EAE4DC]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal">
                  Recent Journal
                </h2>
                <p className="text-xs text-[#8F8A80] mt-0.5">Your practice reflections and notes</p>
              </div>
              <button
                onClick={onOpenLogModal}
                className="text-xs font-bold text-[#6E8B6B] hover:underline"
              >
                + Add Entry
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-10 px-4 bg-[#FAF7F2] rounded-2xl border border-[#ECE5DC]">
                <p className="text-sm text-[#8F8A80]">No practice sessions recorded yet.</p>
                <p className="text-xs text-[#9B9890] mt-1">
                  Ready to begin? Spend 15-30 minutes with your craft today and write a reflection.
                </p>
                <button
                  onClick={onOpenLogModal}
                  className="mt-4 text-xs font-semibold text-[#6E8B6B] bg-[#EFF4EE] hover:bg-[#E3ECE2] px-4 py-2 rounded-xl transition-colors"
                >
                  Log your first session
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.slice(-4).reverse().map((entry) => {
                  const hobby = hobbies.find((h) => h.id === entry.hobbyId) || {
                    name: 'Craft',
                    color: '#6E8B6B',
                    bg: '#EFF4EE',
                  }
                  return (
                    <div
                      key={entry.id}
                      className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#ECE5DC] hover:border-[#DFD7CD] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: hobby.bg, color: hobby.color }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                          >
                            {hobby.name}
                          </span>
                          <span className="text-xs text-[#8F8A80]">{entry.date}</span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#EEE9E0] text-[#5A554D]">
                          {entry.duration}m
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-[#5A554D] leading-relaxed italic bg-white/70 p-2.5 rounded-xl mt-1.5 border border-[#F0EBE2]">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Detail Screen Content (PC Ratio) ─── */
function DetailContent({
  hobby,
  activeTab,
  onTabChange,
  expandedMilestones,
  onToggleMilestone,
  onBack,
  onOpenLogModal,
  onOpenAddMilestoneModal,
}: {
  hobby: Hobby
  activeTab: Tab
  onTabChange: (t: Tab) => void
  expandedMilestones: Set<string>
  onToggleMilestone: (id: string) => void
  onBack: () => void
  onOpenLogModal: () => void
  onOpenAddMilestoneModal: () => void
}) {
  const { milestones, sessions, toggleCheckpoint } = useStore()
  const hobbyMilestones = milestones.filter((m) => m.hobbyId === hobby.id)
  const hobbySessions = sessions.filter((s) => s.hobbyId === hobby.id)

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-[#6C675E] hover:text-[#1E1C19] transition-colors cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Back to Dashboard</span>
      </button>

      {/* Hero Banner in PC Format */}
      <div
        style={{
          background: `linear-gradient(135deg, ${hobby.color} 0%, ${hobby.color}D9 100%)`,
        }}
        className="rounded-3xl p-8 sm:p-10 text-white shadow-lg relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-wider bg-white/20 px-3.5 py-1 rounded-full mb-3">
              {hobby.category}
            </span>
            <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-4xl sm:text-5xl font-normal leading-tight">
              {hobby.name}
            </h1>
            <p className="text-white/80 text-sm mt-2 max-w-xl">
              Dedicated mastery pathway. Track practice time, complete technical milestones, and reflect in your session journal.
            </p>
          </div>

          {/* Quick stats on hero */}
          <div className="flex items-center gap-6 bg-black/15 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shrink-0">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Practice Time</p>
              <p className="text-3xl font-bold mt-1">{Math.round(hobby.hours)}h</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Sessions</p>
              <p className="text-3xl font-bold mt-1">{hobby.sessions}</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Goals</p>
              <p className="text-3xl font-bold mt-1">{hobbyMilestones.length}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-8 pt-6 border-t border-white/20 flex items-center gap-4">
          <span className="text-xs font-semibold text-white/90">Overall Craft Progress</span>
          <div className="flex-1 h-2.5 bg-white/25 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.round(hobby.progress * 100)}%` }}
              className="h-full bg-white rounded-full transition-all duration-300"
            />
          </div>
          <span className="text-sm font-bold text-white">{Math.round(hobby.progress * 100)}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#EAE4DC] pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => onTabChange('milestones')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'milestones'
                ? 'bg-white text-[#1E1C19] shadow-sm border border-[#EAE4DC]'
                : 'text-[#8F8A80] hover:text-[#1E1C19]'
            }`}
          >
            Goals & Milestones ({hobbyMilestones.length})
          </button>
          <button
            onClick={() => onTabChange('journal')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-white text-[#1E1C19] shadow-sm border border-[#EAE4DC]'
                : 'text-[#8F8A80] hover:text-[#1E1C19]'
            }`}
          >
            Session Journal ({hobbySessions.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddMilestoneModal}
            className="text-xs font-bold text-[#5A554D] bg-[#EEE9E0] hover:bg-[#E2DBD0] px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            + Add Milestone
          </button>
          <button
            onClick={onOpenLogModal}
            style={{ backgroundColor: hobby.color }}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span>Log Practice</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'milestones' ? (
        hobbyMilestones.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-[#EAE4DC] shadow-sm text-center">
            <p className="text-base font-bold text-[#1E1C19]">No milestones for {hobby.name} yet.</p>
            <p className="text-xs text-[#8F8A80] mt-1">Set an intention or technical drill to track your progress.</p>
            <button
              onClick={onOpenAddMilestoneModal}
              style={{ backgroundColor: hobby.color }}
              className="mt-4 text-xs font-bold text-white px-5 py-2.5 rounded-xl shadow-sm cursor-pointer"
            >
              + Create First Milestone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hobbyMilestones.map((m) => {
              const done = m.checkpoints.filter((c) => c.done).length
              const total = m.checkpoints.length
              const pct = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <div key={m.id} className="bg-white rounded-2xl p-6 border border-[#EAE4DC] shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs text-[#8F8A80] font-medium">Due {m.due}</span>
                      <h3 className="text-lg font-bold text-[#1E1C19] mt-0.5">{m.title}</h3>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FAF7F2] text-[#6C675E] border border-[#ECE5DC]">
                      {done}/{total} done
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#EEE9E0] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: hobby.color }}
                        className="h-full rounded-full transition-all duration-300"
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#8F8A80]">{pct}%</span>
                  </div>

                  {/* Checkpoint list */}
                  <div className="mt-4 pt-4 border-t border-[#F0EBE2] space-y-2.5">
                    {m.checkpoints.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => toggleCheckpoint(m.id, cp.id)}
                      >
                        <Checkbox
                          checked={cp.done}
                          color={hobby.color}
                          onToggle={() => toggleCheckpoint(m.id, cp.id)}
                        />
                        <span
                          className={`text-sm ${
                            cp.done ? 'line-through text-[#9B9890]' : 'text-[#36322D] group-hover:text-[#1E1C19]'
                          }`}
                        >
                          {cp.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-[#EAE4DC] shadow-sm">
          {hobbySessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[#8F8A80]">No practice sessions logged yet for this craft.</p>
              <button
                onClick={onOpenLogModal}
                className="mt-3 text-xs font-semibold text-[#6E8B6B] bg-[#EFF4EE] px-4 py-2 rounded-xl cursor-pointer"
              >
                Log your first session
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EBE2]">
              {hobbySessions.map((session) => (
                <div key={session.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#1E1C19]">{session.date}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FAF7F2] text-[#6C675E] border border-[#ECE5DC]">
                        {session.duration} minutes
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-sm text-[#5A554D] mt-2 leading-relaxed italic">
                        "{session.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Explore Screen Content (PC Grid) ─── */
function ExploreContent({
  onAddCraft,
}: {
  onAddCraft: (craft: typeof EXPLORE_CRAFTS[0]) => void
}) {
  const { hobbies } = useStore()

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#6E8B6B] bg-[#EFF4EE] px-3 py-1 rounded-full">
          Creative Discovery
        </span>
        <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-4xl text-[#1E1C19] font-normal mt-2">
          Explore New Crafts & Disciplines
        </h1>
        <p className="text-[#6C675E] text-sm mt-1 max-w-2xl">
          Curated learning roadmaps, estimated time to foundational competency, and beginner gear recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXPLORE_CRAFTS.map((craft) => {
          const alreadyAdded = hobbies.some((h) => h.name.toLowerCase() === craft.name.toLowerCase())

          return (
            <div
              key={craft.id}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAE4DC] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    style={{ backgroundColor: craft.bg, color: craft.color }}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                  >
                    {craft.category}
                  </span>
                  <span className="text-xs text-[#8F8A80] font-medium">{craft.difficulty}</span>
                </div>

                <h3 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal">
                  {craft.name}
                </h3>
                <p className="text-xs text-[#6C675E] mt-2 leading-relaxed">
                  {craft.desc}
                </p>

                <div className="mt-4 pt-4 border-t border-[#F0EBE2] space-y-2 text-xs text-[#6C675E]">
                  <div>
                    <span className="font-semibold text-[#1E1C19]">Time to Basics: </span>
                    <span>{craft.hoursToBasics}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#1E1C19]">Starter Kit: </span>
                    <span className="text-[#8F8A80]">{craft.starterKit}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F0EBE2]">
                <button
                  disabled={alreadyAdded}
                  onClick={() => onAddCraft(craft)}
                  style={{
                    backgroundColor: alreadyAdded ? '#EEE9E0' : craft.color,
                    color: alreadyAdded ? '#9B9890' : 'white',
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:cursor-default"
                >
                  {alreadyAdded ? '✓ Added to My Crafts' : '+ Start This Craft'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Analytics Screen Content (PC Ratio) ─── */
function AnalyticsContent() {
  const { hobbies, sessions, streakCount } = useStore()
  const totalHours = hobbies.reduce((sum, h) => sum + h.hours, 0)
  const totalSessions = hobbies.reduce((sum, h) => sum + h.sessions, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-4xl text-[#1E1C19] font-normal">
          Practice Analytics & Velocity
        </h1>
        <p className="text-[#6C675E] text-sm mt-1">
          Objective visual metrics on time invested, session rhythm, and milestone completion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-[#EAE4DC] shadow-sm">
          <p className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider">Lifetime Practice</p>
          <p className="text-3xl font-bold text-[#1E1C19] mt-2">{Math.round(totalHours)} Hours</p>
          <p className="text-xs text-[#6E8B6B] font-semibold mt-1">Across {hobbies.length} active creative crafts</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-[#EAE4DC] shadow-sm">
          <p className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider">Completed Sessions</p>
          <p className="text-3xl font-bold text-[#1E1C19] mt-2">{totalSessions} Sessions</p>
          <p className="text-xs text-[#8F8A80] font-semibold mt-1">Recorded practice sessions</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-[#EAE4DC] shadow-sm">
          <p className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider">Consistency Streak</p>
          <p className="text-3xl font-bold text-[#CC8F3F] mt-2">{streakCount} Days</p>
          <p className="text-xs text-[#CC8F3F] font-semibold mt-1">Current active streak</p>
        </div>
      </div>

      {/* Time Breakdown by Craft */}
      <div className="bg-white rounded-3xl p-8 border border-[#EAE4DC] shadow-sm">
        <h2 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal mb-6">
          Hours Logged per Craft
        </h2>
        {hobbies.length === 0 ? (
          <p className="text-sm text-[#8F8A80]">No crafts added yet. Start a craft to see analytics!</p>
        ) : (
          <div className="space-y-6">
            {hobbies.map((h) => {
              const pct = totalHours > 0 ? Math.round((h.hours / totalHours) * 100) : 0
              return (
                <div key={h.id}>
                  <div className="flex justify-between text-sm mb-2 font-semibold">
                    <span className="text-[#1E1C19] flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: h.color }} />
                      {h.name}
                    </span>
                    <span className="text-[#6C675E]">{Math.round(h.hours)} hrs ({pct}%)</span>
                  </div>
                  <div className="h-3 bg-[#EEE9E0] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%`, backgroundColor: h.color }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Profile & Account Management Screen Content ─── */
function ProfileContent({
  onOpenCreateAccountModal,
  onResetData,
}: {
  onOpenCreateAccountModal: () => void
  onResetData: () => void
}) {
  const { hobbies, streakCount, sessions, currentUser, accounts, switchAccount } = useStore()
  const totalHours = hobbies.reduce((sum, h) => sum + h.hours, 0)
  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      user: currentUser,
      hobbies,
      sessions,
      streakCount,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `craftpath-${currentUser?.name.toLowerCase().replace(/\s+/g, '-') || 'data'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-8 border border-[#EAE4DC] shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div
          style={{ backgroundColor: currentUser?.avatarColor || '#CC8F3F' }}
          className="w-24 h-24 rounded-3xl text-white text-3xl font-bold flex items-center justify-center shadow-md"
        >
          {userInitial}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-3xl text-[#1E1C19] font-normal">
            {currentUser?.name || 'Crafter'}
          </h1>
          <p className="text-[#8F8A80] text-sm mt-1">Creative Enthusiast & Multidisciplinary Crafter</p>
          <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF4EE] text-[#516E4E]">
              {hobbies.length} Active Crafts
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF3E3] text-[#CC8F3F]">
              🔥 {streakCount}-Day Streak
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF2F5] text-[#5B6B77]">
              {Math.round(totalHours)}h Total Practice
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenCreateAccountModal}
            className="px-4 py-2.5 rounded-xl bg-[#6E8B6B] text-white text-xs font-bold hover:bg-[#5E795B] transition-colors shadow-sm cursor-pointer"
          >
            + Create Another Account
          </button>
          <button
            onClick={handleExportData}
            className="px-4 py-2.5 rounded-xl border border-[#D5CEC4] hover:bg-[#FAF7F2] text-xs font-bold text-[#5A554D] transition-colors cursor-pointer"
          >
            Export Data (JSON)
          </button>
        </div>
      </div>

      {/* Account Switching (if multiple accounts exist) */}
      {accounts.length > 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE4DC] shadow-sm">
          <h2 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal mb-4">
            Switch Accounts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((acc) => {
              const isCurrent = acc.id === currentUser?.id
              return (
                <div
                  key={acc.id}
                  onClick={() => switchAccount(acc.id)}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isCurrent
                      ? 'border-[#6E8B6B] bg-[#EFF4EE]/50'
                      : 'border-[#EAE4DC] hover:border-[#D5CEC4] bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: acc.avatarColor }}
                      className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm"
                    >
                      {acc.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1E1C19]">{acc.name}</p>
                      <p className="text-xs text-[#8F8A80]">Created {acc.createdAt}</p>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-bold text-[#6E8B6B] bg-white px-2.5 py-1 rounded-full border border-[#6E8B6B]/30">
                      Active
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Danger Zone: Reset Data */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-200 shadow-sm">
        <h2 className="text-base font-bold text-red-800 mb-1">Start Fresh / Reset Data</h2>
        <p className="text-xs text-[#8F8A80] mb-4">
          Want to clear all data and start completely brand new? This will reset your studio and return you to onboarding.
        </p>
        <button
          onClick={onResetData}
          className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
        >
          Reset Studio & Start Fresh
        </button>
      </div>
    </div>
  )
}

/* ─── Add Milestone Modal ─── */
function AddMilestoneModal({
  hobbies,
  onClose,
  onAddMilestone,
}: {
  hobbies: Hobby[]
  onClose: () => void
  onAddMilestone: (hobbyId: string, title: string, due: string, checkpoints: string[]) => void
}) {
  const [hobbyId, setHobbyId] = useState(hobbies[0]?.id || '')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('2 weeks')
  const [checkpoints, setCheckpoints] = useState(['', ''])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !hobbyId) return

    const validCheckpoints = checkpoints
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

    onAddMilestone(hobbyId, title.trim(), due.trim(), validCheckpoints)
    onClose()
  }

  const updateCheckpoint = (idx: number, val: string) => {
    const updated = [...checkpoints]
    updated[idx] = val
    setCheckpoints(updated)
  }

  const addCheckpointRow = () => {
    setCheckpoints([...checkpoints, ''])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
      <div className="relative z-10 bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#EAE4DC] max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE4DC]">
          <div>
            <h2 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal">
              Add New Milestone
            </h2>
            <p className="text-xs text-[#8F8A80] mt-0.5">Define an achievable target for your craft</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#EEE9E0] text-[#6C675E] flex items-center justify-center">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Select Craft</label>
            <div className="flex gap-2 flex-wrap">
              {hobbies.map((h) => (
                <button
                  type="button"
                  key={h.id}
                  onClick={() => setHobbyId(h.id)}
                  style={{
                    backgroundColor: hobbyId === h.id ? h.color : '#EEE9E0',
                    color: hobbyId === h.id ? 'white' : '#5A554D',
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Milestone Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master fingerpicking pattern #2, complete first vase..."
              className="w-full bg-white border border-[#EAE4DC] rounded-xl p-3 text-sm text-[#1E1C19] focus:outline-none focus:border-[#6E8B6B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Target Due Date / Window</label>
            <input
              type="text"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              placeholder="e.g. Next week, Oct 25, 30 days..."
              className="w-full bg-white border border-[#EAE4DC] rounded-xl p-3 text-sm text-[#1E1C19] focus:outline-none focus:border-[#6E8B6B]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider">Sub-Checkpoints</label>
              <button
                type="button"
                onClick={addCheckpointRow}
                className="text-xs font-bold text-[#6E8B6B] hover:underline cursor-pointer"
              >
                + Add Checkpoint
              </button>
            </div>
            <div className="space-y-2">
              {checkpoints.map((cp, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={cp}
                  onChange={(e) => updateCheckpoint(idx, e.target.value)}
                  placeholder={`Checkpoint #${idx + 1}`}
                  className="w-full bg-white border border-[#EAE4DC] rounded-xl p-2.5 text-xs text-[#1E1C19] focus:outline-none focus:border-[#6E8B6B]"
                />
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#EAE4DC] flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-[#D5CEC4] text-xs font-bold text-[#6C675E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !hobbyId}
              className="flex-2 py-3 px-4 rounded-xl bg-[#6E8B6B] text-white text-xs font-bold shadow-md hover:bg-[#5E795B] disabled:opacity-50 cursor-pointer"
            >
              Save Milestone
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Add Hobby Modal ─── */
function AddHobbyModal({
  onClose,
  onAddHobby,
}: {
  onClose: () => void
  onAddHobby: (name: string, category: string, color: string) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Visual Arts')
  const [color, setColor] = useState('#6E8B6B')

  const colors = ['#6E8B6B', '#CC8F3F', '#5B6B77', '#B26E53', '#4F7959', '#655A75', '#C86446']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAddHobby(name.trim(), category.trim(), color)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
      <div className="relative z-10 bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#EAE4DC] max-w-md w-full p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE4DC]">
          <div>
            <h2 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal">
              Add New Craft
            </h2>
            <p className="text-xs text-[#8F8A80] mt-0.5">Start tracking a new hobby</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#EEE9E0] text-[#6C675E] flex items-center justify-center">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Craft Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Leathercraft, Watercolor, Piano..."
              className="w-full bg-white border border-[#EAE4DC] rounded-xl p-3 text-sm text-[#1E1C19] focus:outline-none focus:border-[#6E8B6B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Tactile Crafts, Music, Culinary..."
              className="w-full bg-white border border-[#EAE4DC] rounded-xl p-3 text-sm text-[#1E1C19] focus:outline-none focus:border-[#6E8B6B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Color Theme</label>
            <div className="flex gap-3">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                    color === c ? 'ring-2 ring-offset-2 ring-[#1E1C19] scale-110' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#EAE4DC] flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-[#D5CEC4] text-xs font-bold text-[#6C675E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-2 py-3 px-4 rounded-xl bg-[#6E8B6B] text-white text-xs font-bold shadow-md hover:bg-[#5E795B] disabled:opacity-50 cursor-pointer"
            >
              Add Craft
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Desktop Centered Session Modal ─── */
function DesktopSessionModal({
  hobbies,
  hobbyId,
  onHobbyChange,
  duration,
  onDurationChange,
  notes,
  onNotesChange,
  onClose,
  onOpenAddHobbyModal,
}: {
  hobbies: Hobby[]
  hobbyId: string
  onHobbyChange: (id: string) => void
  duration: number
  onDurationChange: (d: number) => void
  notes: string
  onNotesChange: (n: string) => void
  onClose: () => void
  onOpenAddHobbyModal: () => void
}) {
  const { milestones, saveSession } = useStore()
  const hobby = hobbies.find((h) => h.id === hobbyId) || hobbies[0]
  const hobbyMilestones = hobby ? milestones.filter((m) => m.hobbyId === hobby.id) : []
  const [selectedGoal, setSelectedGoal] = useState(hobbyMilestones[0]?.id ?? '')

  useEffect(() => {
    if (hobbyMilestones.length > 0) {
      setSelectedGoal(hobbyMilestones[0].id)
    }
  }, [hobbyId])

  const handleSave = () => {
    if (!hobby) return
    saveSession({
      hobbyId: hobby.id,
      duration,
      notes,
      date: new Date().toISOString().split('T')[0],
      milestoneId: selectedGoal || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
      <div className="relative z-10 bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#EAE4DC] max-w-lg w-full p-6 sm:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE4DC]">
          <div>
            <h2 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19] font-normal">
              Log Practice Session
            </h2>
            <p className="text-xs text-[#8F8A80] mt-0.5">Record your focused practice & reflections</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#EEE9E0] text-[#6C675E] flex items-center justify-center">
            ✕
          </button>
        </div>

        {hobbies.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#8F8A80]">You don't have any crafts yet to log sessions for.</p>
            <button
              onClick={() => {
                onClose()
                onOpenAddHobbyModal()
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#6E8B6B] text-white text-xs font-bold cursor-pointer"
            >
              + Create a Craft First
            </button>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <div>
              <label className="text-[11px] font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Select Craft</label>
              <div className="flex gap-2 flex-wrap">
                {hobbies.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => onHobbyChange(h.id)}
                    style={{
                      backgroundColor: hobbyId === h.id ? h.color : '#EEE9E0',
                      color: hobbyId === h.id ? 'white' : '#5A554D',
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Practice Duration</label>
              <div className="bg-white p-4 rounded-2xl border border-[#EAE4DC] flex items-center justify-between">
                <button
                  onClick={() => onDurationChange(Math.max(5, duration - 5))}
                  className="w-10 h-10 rounded-xl bg-[#EEE9E0] text-xl font-bold text-[#5A554D] hover:bg-[#E2DBD0] transition-colors"
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-4xl font-bold text-[#1E1C19]">{duration}</span>
                  <span className="text-xs text-[#8F8A80] block">minutes</span>
                </div>
                <button
                  onClick={() => onDurationChange(Math.min(360, duration + 5))}
                  style={{ backgroundColor: hobby?.color || '#6E8B6B' }}
                  className="w-10 h-10 rounded-xl text-xl font-bold text-white hover:opacity-90 transition-opacity"
                >
                  +
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                {[15, 30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => onDurationChange(mins)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      duration === mins ? 'bg-[#1E1C19] text-white' : 'bg-[#EEE9E0] text-[#6C675E] hover:bg-[#E4DDD2]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {hobbyMilestones.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Towards Goal / Milestone</label>
                <div className="space-y-2">
                  {hobbyMilestones.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedGoal(m.id)}
                      style={{
                        borderColor: selectedGoal === m.id ? hobby?.color : '#EAE4DC',
                        backgroundColor: selectedGoal === m.id ? `${hobby?.color}15` : 'white',
                      }}
                      className="w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all"
                    >
                      <span
                        style={{ backgroundColor: selectedGoal === m.id ? hobby?.color : '#CEC8BF' }}
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                      />
                      <span className={selectedGoal === m.id ? 'text-[#1E1C19]' : 'text-[#6C675E]'}>{m.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">
                Practice Notes & Reflections
              </label>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="What technique clicked? What felt challenging? Any breakthroughs or notes for next time..."
                rows={3}
                className="w-full bg-white border border-[#EAE4DC] rounded-2xl p-3.5 text-sm text-[#1E1C19] focus:outline-none focus:border-[#6E8B6B] transition-colors resize-none"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE4DC] flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-[#D5CEC4] text-xs font-bold text-[#6C675E]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{ backgroundColor: hobby?.color || '#6E8B6B' }}
                className="flex-2 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md hover:opacity-95 transition-opacity"
              >
                Save Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main App (PC Screen Ratio) ─── */
function App() {
  const {
    screen,
    setScreen,
    activeNav,
    setNav,
    selectedHobbyId,
    setSelectedHobby,
    hobbies,
    addHobby,
    addMilestone,
    isOnboarded,
    createAccount,
    resetToNewUser,
  } = useStore()

  const [showLogModal, setShowLogModal] = useState(false)
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false)
  const [showAddHobbyModal, setShowAddHobbyModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)

  const [activeTab, setActiveTab] = useState<Tab>('milestones')
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [modalHobbyId, setModalHobbyId] = useState('')
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')

  // Sync modalHobbyId when hobbies change
  useEffect(() => {
    if (hobbies.length > 0 && !modalHobbyId) {
      setModalHobbyId(hobbies[0].id)
    }
  }, [hobbies, modalHobbyId])

  const selectedHobby = hobbies.find((h) => h.id === selectedHobbyId) || hobbies[0]

  function toggleMilestone(id: string) {
    setExpandedMilestones((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function openDetail(hobby: Hobby) {
    setSelectedHobby(hobby.id)
    setScreen('detail')
    setActiveTab('milestones')
  }

  function handleAddCraftFromExplore(craft: typeof EXPLORE_CRAFTS[0]) {
    const newHobby: Hobby = {
      id: 'h-' + Math.random().toString(36).substr(2, 6),
      name: craft.name,
      category: craft.category,
      color: craft.color,
      bg: craft.bg,
      hours: 0,
      sessions: 0,
      progress: 0,
    }
    addHobby(newHobby)
  }

  function handleAddMilestone(hobbyId: string, title: string, due: string, checkpointTitles: string[]) {
    addMilestone({
      hobbyId,
      title,
      due,
      checkpoints: checkpointTitles.map((t, idx) => ({
        id: `cp-${Date.now()}-${idx}`,
        title: t,
        done: false,
      })),
    })
  }

  function handleAddCustomHobby(name: string, category: string, color: string) {
    const newHobby: Hobby = {
      id: 'h-' + Math.random().toString(36).substr(2, 6),
      name,
      category,
      color,
      bg: `${color}18`,
      hours: 0,
      sessions: 0,
      progress: 0,
    }
    addHobby(newHobby)
    setModalHobbyId(newHobby.id)
  }

  // If user is not onboarded, show onboarding / account creation screen
  if (!isOnboarded) {
    return (
      <OnboardingScreen
        onComplete={(name, hobbyName, category, milestoneTitle) => {
          createAccount(name, hobbyName, category, milestoneTitle)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#1E1C19]">
      {/* Top PC Web Navbar */}
      <WebNavbar
        active={activeNav}
        onChange={(nav) => {
          setNav(nav)
          if (screen === 'detail') {
            setScreen('home')
          }
        }}
        onOpenLogModal={() => {
          setModalHobbyId(selectedHobbyId || hobbies[0]?.id || '')
          setShowLogModal(true)
        }}
        onOpenAccountModal={() => {
          setNav('profile')
        }}
      />

      {/* Main PC Viewport Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
        {activeNav === 'hobbies' && screen === 'home' && (
          <DashboardContent
            onSelectHobbyDetail={openDetail}
            onOpenLogModal={() => {
              setModalHobbyId(selectedHobbyId || hobbies[0]?.id || '')
              setShowLogModal(true)
            }}
            onOpenAddMilestoneModal={() => setShowAddMilestoneModal(true)}
            onOpenAddHobbyModal={() => setShowAddHobbyModal(true)}
          />
        )}

        {activeNav === 'hobbies' && screen === 'detail' && selectedHobby && (
          <DetailContent
            hobby={selectedHobby}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            expandedMilestones={expandedMilestones}
            onToggleMilestone={toggleMilestone}
            onBack={() => setScreen('home')}
            onOpenLogModal={() => {
              setModalHobbyId(selectedHobby.id)
              setShowLogModal(true)
            }}
            onOpenAddMilestoneModal={() => setShowAddMilestoneModal(true)}
          />
        )}

        {activeNav === 'explore' && (
          <ExploreContent onAddCraft={handleAddCraftFromExplore} />
        )}

        {activeNav === 'analytics' && <AnalyticsContent />}

        {activeNav === 'profile' && (
          <ProfileContent
            onOpenCreateAccountModal={() => setShowAccountModal(true)}
            onResetData={resetToNewUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EAE4DC] bg-[#FAF7F2] py-6 mt-12 text-center text-xs text-[#8F8A80]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CraftPath — Dedicated to tactile learning, creative practice, and patient mastery.</span>
          <span>CraftPath Studio v1.0</span>
        </div>
      </footer>

      {/* Session Modal */}
      {showLogModal && (
        <DesktopSessionModal
          hobbies={hobbies}
          hobbyId={modalHobbyId}
          onHobbyChange={setModalHobbyId}
          duration={duration}
          onDurationChange={setDuration}
          notes={notes}
          onNotesChange={setNotes}
          onClose={() => setShowLogModal(false)}
          onOpenAddHobbyModal={() => setShowAddHobbyModal(true)}
        />
      )}

      {/* Add Milestone Modal */}
      {showAddMilestoneModal && (
        <AddMilestoneModal
          hobbies={hobbies}
          onClose={() => setShowAddMilestoneModal(false)}
          onAddMilestone={handleAddMilestone}
        />
      )}

      {/* Add Hobby Modal */}
      {showAddHobbyModal && (
        <AddHobbyModal
          onClose={() => setShowAddHobbyModal(false)}
          onAddHobby={handleAddCustomHobby}
        />
      )}

      {/* Account Creation Modal from Profile */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowAccountModal(false)} className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-[#EAE4DC] max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE4DC]">
              <h2 style={{ fontFamily: 'DM Serif Display, Georgia, serif' }} className="text-2xl text-[#1E1C19]">
                Create Another Account
              </h2>
              <button onClick={() => setShowAccountModal(false)} className="w-8 h-8 rounded-full bg-[#EEE9E0] text-[#6C675E] flex items-center justify-center">
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const newName = (form.elements.namedItem('accName') as HTMLInputElement).value
                const newHobby = (form.elements.namedItem('accHobby') as HTMLInputElement).value
                if (newName.trim()) {
                  createAccount(newName.trim(), newHobby.trim())
                  setShowAccountModal(false)
                }
              }}
              className="py-5 space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Account Name</label>
                <input
                  name="accName"
                  type="text"
                  required
                  placeholder="e.g. Mark (Studio)"
                  className="w-full bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl p-3 text-sm text-[#1E1C19]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#8F8A80] uppercase tracking-wider block mb-2">Initial Craft (Optional)</label>
                <input
                  name="accHobby"
                  type="text"
                  placeholder="e.g. Pottery, Guitar, Writing..."
                  className="w-full bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl p-3 text-sm text-[#1E1C19]"
                />
              </div>
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#D5CEC4] text-xs font-bold text-[#6C675E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-[#6E8B6B] text-white text-xs font-bold shadow-md hover:bg-[#5E795B]"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
