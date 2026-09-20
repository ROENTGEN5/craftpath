import { TodoItem, Priority, Recurrence, AIPersonality } from '../types'

const GROQ_DIRECT_BASE = 'https://api.groq.com/openai/v1'
const GROQ_PROXY_BASE = '/groq-api/openai/v1'

export const CANDIDATE_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]

const PRIMARY_MODEL = 'llama-3.1-8b-instant'
const FAST_MODEL = 'llama-3.1-8b-instant'

let cachedBestModel: string | null = null
let cachedModelKey: string | null = null
const inaccessibleModels = new Set<string>()

export function clearGroqModelCache() {
  cachedBestModel = null
  cachedModelKey = null
  inaccessibleModels.clear()
}

export async function getActiveGroqModel(apiKey: string): Promise<string> {
  const cleanKey = apiKey.trim()
  if (cachedBestModel && cachedModelKey === cleanKey && !inaccessibleModels.has(cachedBestModel)) {
    return cachedBestModel
  }

  const baseUrl = getGroqBaseUrl()
  const modelsPath = '/models'

  try {
    const res = await fetch(`${baseUrl}${modelsPath}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
    })

    if (res.ok) {
      const data = await res.json()
      const availableIds: string[] = (data?.data || []).map((m: any) => m.id)

      // 1. Pick first matching preferred model that is not known to be inaccessible
      for (const candidate of CANDIDATE_MODELS) {
        if (availableIds.includes(candidate) && !inaccessibleModels.has(candidate)) {
          cachedBestModel = candidate
          cachedModelKey = cleanKey
          console.log(`[Groq] Detected and selected best available model: ${candidate}`)
          return candidate
        }
      }

      // 2. Pick any llama/meta-llama model that is not a guard/audio model and not inaccessible
      const anyLlama = availableIds.find(
        (id) =>
          !inaccessibleModels.has(id) &&
          (id.includes('llama') || id.includes('mixtral') || id.includes('gemma')) &&
          !id.includes('guard') &&
          !id.includes('whisper') &&
          !id.includes('audio') &&
          !id.includes('tts') &&
          !id.includes('canopylabs') &&
          !id.includes('orpheus')
      )
      if (anyLlama) {
        cachedBestModel = anyLlama
        cachedModelKey = cleanKey
        console.log(`[Groq] Fallback to available chat model: ${anyLlama}`)
        return anyLlama
      }
    }
  } catch (err) {
    console.warn('[Groq] Failed to fetch /models for dynamic selection:', err)
  }

  return 'llama-3.1-8b-instant'
}

function getGroqBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return GROQ_PROXY_BASE
    }
  }
  return GROQ_DIRECT_BASE
}

export interface SubtaskSuggestion {
  title: string
  description?: string
  deadline: string
  priority: Priority
  category: string
  recurrence: Recurrence
}

export interface ParsedTask {
  title: string
  description?: string
  deadline: string
  priority: Priority
  category: string
  recurrence: Recurrence
}

export interface TriageSuggestion {
  id: string
  title: string
  originalDeadline: string
  proposedDeadline: string
  reason: string
}

async function callGroqAPI(
  apiKey: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  modelPreference?: string,
  temperature: number = 0.7,
  jsonMode: boolean = false
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Groq API Key is missing. Please enter your API key in AI Coach Settings.')
  }

  const cleanKey = apiKey.trim()
  const baseUrl = getGroqBaseUrl()
  const chatPath = '/chat/completions'

  // Dynamically determine the best model if not explicitly specified
  let modelToUse = modelPreference
  if (!modelToUse || modelToUse === PRIMARY_MODEL || modelToUse === FAST_MODEL) {
    modelToUse = await getActiveGroqModel(cleanKey)
  }

  const executeRequest = async (targetModel: string): Promise<Response> => {
    return await fetch(`${baseUrl}${chatPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  }

  let response: Response
  try {
    response = await executeRequest(modelToUse)
  } catch (netErr: any) {
    throw new Error(`Network error connecting to Groq: ${netErr.message || 'Check your internet connection'}`)
  }

  // Handle errors
  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    let parsedMsg = ''
    let errorCode = ''
    try {
      const jsonErr = JSON.parse(errBody)
      parsedMsg = jsonErr?.error?.message || ''
      errorCode = jsonErr?.error?.code || ''
    } catch {
      parsedMsg = errBody
    }

    // If model is decommissioned, not found, or requires terms acceptance, try available fallbacks
    const isModelError =
      response.status === 404 ||
      parsedMsg.toLowerCase().includes('model') ||
      parsedMsg.toLowerCase().includes('terms acceptance') ||
      errorCode === 'model_decommissioned' ||
      errorCode === 'model_not_found'

    if (isModelError) {
      console.warn(`[Groq] Model '${modelToUse}' returned error: ${parsedMsg}. Trying fallback models...`)
      cachedBestModel = null
      inaccessibleModels.add(modelToUse)

      for (const fallbackModel of CANDIDATE_MODELS) {
        if (fallbackModel !== modelToUse && !inaccessibleModels.has(fallbackModel)) {
          try {
            const fallbackRes = await executeRequest(fallbackModel)
            if (fallbackRes.ok) {
              const data = await fallbackRes.json()
              const content = data?.choices?.[0]?.message?.content || ''
              cachedBestModel = fallbackModel
              console.log(`[Groq] Fallback succeeded with model: ${fallbackModel}`)
              return content.trim()
            } else {
              const fErr = await fallbackRes.text().catch(() => '')
              if (
                fallbackRes.status === 404 ||
                fallbackRes.status === 400 ||
                fErr.includes('not exist') ||
                fErr.includes('not have access') ||
                fErr.includes('terms acceptance')
              ) {
                inaccessibleModels.add(fallbackModel)
              }
            }
          } catch {
            // continue fallback attempts
          }
        }
      }
    }

    if (response.status === 401) {
      throw new Error(`Invalid Groq API Key: ${parsedMsg || 'Authentication failed. Please check your key.'}`)
    }
    if (response.status === 429) {
      throw new Error(`Groq rate limit reached: ${parsedMsg || 'Please wait a moment before trying again.'}`)
    }
    throw new Error(`Groq API Error (${response.status}): ${parsedMsg || response.statusText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content || ''
  return content.trim()
}

/**
 * Validate that a Groq API key works by querying the /models endpoint
 */
export async function validateGroqKey(
  apiKey: string
): Promise<{ success: boolean; activeModel?: string; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'Groq API Key is empty.' }
  }

  const cleanKey = apiKey.trim()
  const baseUrl = getGroqBaseUrl()
  const modelsPath = '/models'

  try {
    const response = await fetch(`${baseUrl}${modelsPath}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      let parsedMsg = ''
      try {
        const jsonErr = JSON.parse(errBody)
        parsedMsg = jsonErr?.error?.message || ''
      } catch {
        parsedMsg = errBody
      }
      return { success: false, error: parsedMsg || `Groq returned status ${response.status}` }
    }

    const data = await response.json()
    const availableIds: string[] = (data?.data || []).map((m: any) => m.id)

    // Find and cache the best model immediately
    let detectedModel = 'llama-3.3-70b-versatile'
    for (const candidate of CANDIDATE_MODELS) {
      if (availableIds.includes(candidate)) {
        detectedModel = candidate
        break
      }
    }

    cachedBestModel = detectedModel
    cachedModelKey = cleanKey

    return { success: true, activeModel: detectedModel }
  } catch (err: any) {
    console.error('Groq key validation failed:', err)
    return { success: false, error: err.message || 'Connection failed' }
  }
}

/**
 * Generate a strict, tough-love roast or executive game plan based on the user's current tasks
 */
export async function generateDailyRoast(
  apiKey: string,
  context: {
    userName: string
    todayTasks: TodoItem[]
    overdueTasks: TodoItem[]
    completedTodayCount: number
    streakCount: number
    personality: AIPersonality
  }
): Promise<string> {
  const { userName, todayTasks, overdueTasks, completedTodayCount, streakCount, personality } = context

  let systemPrompt = ''
  if (personality === 'savage') {
    systemPrompt = `You are a savage, hilarious, brutally honest productivity coach. Your goal is to ROAST the user into taking immediate action and stopping procrastination. 
Call them out directly and mock their excuses, especially if they have overdue tasks or haven't finished anything today.
If they did complete tasks, give them sarcastic, reluctant credit, but warn them not to get lazy.
Keep it punchy, funny, and 2-3 sentences max. Use 1 or 2 fitting emojis. Do not use generic filler.`
  } else if (personality === 'sergeant') {
    systemPrompt = `You are an intense military drill sergeant productivity coach. 
Demand absolute discipline. Call out overdue tasks as unacceptable failures in the field. Order immediate execution of today's highest priority task.
Keep it 2-3 sentences max, forceful, and commanding. Use 1 or 2 military/fire emojis.`
  } else {
    systemPrompt = `You are a wise, focused mentor who provides honest, constructive tough love. 
Acknowledge where the user is slacking, provide clear perspective, and challenge them to execute with focus.
Keep it 2-3 sentences max.`
  }

  const userPrompt = `User Name: ${userName || 'Maker'}
Current Streak: ${streakCount} days
Tasks completed today: ${completedTodayCount}
Overdue tasks count: ${overdueTasks.length}
Overdue tasks: ${overdueTasks.map((t) => `"${t.title}" (${t.priority} priority)`).join(', ') || 'None'}
Tasks scheduled for today: ${todayTasks.length}
Today's pending tasks: ${todayTasks.map((t) => `"${t.title}" (${t.priority} priority, category: ${t.category})`).join(', ') || 'None'}

Roast or brief ${userName || 'the user'} right now:`

  return await callGroqAPI(
    apiKey,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    PRIMARY_MODEL,
    0.85
  )
}

/**
 * Magic Task Breakdown: Break down a large or vague goal into 3-5 bite-sized, scheduled subtasks
 */
export async function magicBreakdownTask(
  apiKey: string,
  goalTitle: string,
  category: string = 'Work',
  priority: Priority = 'medium',
  baseDeadline: string
): Promise<SubtaskSuggestion[]> {
  const systemPrompt = `You are an expert productivity architect. Your job is to break down a big or intimidating goal into 3 to 5 concrete, bite-sized, sequential subtasks that eliminate procrastination.
Return ONLY a valid JSON object with a key "tasks" containing an array of objects.
Each object must have:
- "title": string (concise, action-oriented, starting with an active verb)
- "description": string (short 1-sentence tip on how to execute)
- "deadline": string (YYYY-MM-DD, logically spaced starting from the base deadline)
- "priority": "high" | "medium" | "low"
- "category": string (e.g. "${category}")
- "recurrence": "none" | "daily" | "weekdays" | "weekly" (usually "none" unless naturally daily)

Do not wrap in markdown quotes if json mode is on.`

  const userPrompt = `Goal: "${goalTitle}"
Category: ${category}
Base Priority: ${priority}
Base Deadline: ${baseDeadline}

Break this goal down into 3 to 5 realistic, sequential actionable steps.`

  const raw = await callGroqAPI(
    apiKey,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    PRIMARY_MODEL,
    0.6,
    true
  )

  try {
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : parsed.tasks || []
    return list.map((item: any) => ({
      title: item.title || 'Untitled subtask',
      description: item.description || undefined,
      deadline: item.deadline || baseDeadline,
      priority: (['high', 'medium', 'low'].includes(item.priority) ? item.priority : priority) as Priority,
      category: item.category || category,
      recurrence: (['none', 'daily', 'weekdays', 'weekly'].includes(item.recurrence) ? item.recurrence : 'none') as Recurrence,
    }))
  } catch (err) {
    console.error('Failed to parse magic breakdown JSON:', err, raw)
    throw new Error('Failed to generate structured subtasks. Please try again.')
  }
}

/**
 * Natural Language Quick Capture: Parse human language into structured task fields
 */
export async function parseNaturalLanguageInput(
  apiKey: string,
  text: string,
  todayDate: string
): Promise<ParsedTask> {
  const systemPrompt = `You are a precision NLP task parser for a to-do list app.
Given the user's natural language input and today's date (${todayDate}), extract:
- "title": Clean task title without dates/priorities
- "description": Any additional context or null
- "deadline": YYYY-MM-DD calculated relative to today (${todayDate}). If no date is mentioned, default to "${todayDate}".
- "priority": "high" | "medium" | "low" (infer from urgency or keywords like urgent, asap, important)
- "category": "Work" | "Creative" | "Personal" | "Health" | "Study" (pick best fit)
- "recurrence": "none" | "daily" | "weekdays" | "weekly" (if words like "every day", "daily", "every week", "weekdays" appear)

Return ONLY a valid JSON object with these keys.`

  const raw = await callGroqAPI(
    apiKey,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Parse this task: "${text}"` },
    ],
    FAST_MODEL,
    0.2,
    true
  )

  try {
    const p = JSON.parse(raw)
    return {
      title: p.title || text,
      description: p.description || undefined,
      deadline: p.deadline || todayDate,
      priority: (['high', 'medium', 'low'].includes(p.priority) ? p.priority : 'medium') as Priority,
      category: (['Work', 'Creative', 'Personal', 'Health', 'Study'].includes(p.category) ? p.category : 'Work'),
      recurrence: (['none', 'daily', 'weekdays', 'weekly'].includes(p.recurrence) ? p.recurrence : 'none') as Recurrence,
    }
  } catch (err) {
    console.error('Failed to parse natural language task:', err, raw)
    return {
      title: text,
      deadline: todayDate,
      priority: 'medium',
      category: 'Work',
      recurrence: 'none',
    }
  }
}

/**
 * Anti-Procrastination Kickstart: Roast the user on a specific task & give a 5-minute micro-action
 */
export async function kickstartTask(
  apiKey: string,
  task: TodoItem,
  personality: AIPersonality = 'savage'
): Promise<{ roast: string; microAction: string }> {
  const systemPrompt = `You are an anti-procrastination coach specializing in the "5-minute rule" to break inertia.
The user is procrastinating on a specific task: "${task.title}".
Return a valid JSON object with:
- "roast": A funny, ${personality === 'savage' ? 'brutal and witty roast' : 'firm call-out'} of why putting this off is foolish (1-2 sentences).
- "microAction": An ultra-concrete, ridiculously easy 5-MINUTE FIRST STEP that takes almost zero effort to begin right now (e.g. "Open the document and write 1 headline", "Put on running shoes and fill a water bottle").`

  const raw = await callGroqAPI(
    apiKey,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Task: "${task.title}". Deadline: ${task.deadline || 'None'}. Priority: ${task.priority}. Notes: ${task.description || 'None'}` },
    ],
    PRIMARY_MODEL,
    0.7,
    true
  )

  try {
    const p = JSON.parse(raw)
    return {
      roast: p.roast || `Stop staring at "${task.title}" and just do it!`,
      microAction: p.microAction || 'Spend just 2 minutes opening the materials for this task.',
    }
  } catch (err) {
    return {
      roast: `Procrastinating on "${task.title}" won't make it disappear!`,
      microAction: 'Set a 5-minute timer and write the very first sentence or outline.',
    }
  }
}

/**
 * AI Overdue Triage: Smartly redistribute overdue tasks across the coming week
 */
export async function triageOverdueTasks(
  apiKey: string,
  overdueTasks: TodoItem[],
  todayDate: string
): Promise<TriageSuggestion[]> {
  const systemPrompt = `You are a scheduling triage specialist.
Given a list of overdue tasks and today's date (${todayDate}), redistribute them across the upcoming 5-7 days so the user isn't overwhelmed.
Prioritize high-priority items for today or tomorrow, medium for +2-3 days, and low for later.
Return a valid JSON object with a key "suggestions" containing an array of objects:
- "id": string (the task id)
- "title": string
- "originalDeadline": string
- "proposedDeadline": string (YYYY-MM-DD, starting from ${todayDate} onwards)
- "reason": string (short 1-sentence explanation of why this date was chosen)`

  const userPrompt = `Today is ${todayDate}.
Overdue Tasks:
${overdueTasks.map((t) => `- ID: ${t.id}, Title: "${t.title}", Priority: ${t.priority}, Original Deadline: ${t.deadline}`).join('\n')}

Suggest realistic, balanced new dates.`

  const raw = await callGroqAPI(
    apiKey,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    PRIMARY_MODEL,
    0.5,
    true
  )

  try {
    const parsed = JSON.parse(raw)
    return parsed.suggestions || []
  } catch (err) {
    console.error('Failed to parse triage JSON:', err, raw)
    return []
  }
}
