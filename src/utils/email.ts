import { TodoItem, UserAccount } from '../types'

export interface EmailDispatchResult {
  success: boolean
  needsActivation?: boolean
  message: string
}

export function formatTaskBriefing(
  userName: string,
  todayDate: string,
  streakCount: number,
  todayTasks: TodoItem[],
  overdueTasks: TodoItem[],
  aiRoast?: string
): { subject: string; textBody: string; htmlBody: string } {
  const subject = `☀️ CraftPath Morning Briefing: ${todayDate} (🔥 ${streakCount} Day Streak)`

  const pendingCount = todayTasks.length
  const overdueCount = overdueTasks.length

  // Build Text Body
  let text = `Hey ${userName || 'Maker'}! Here is your CraftPath morning task briefing for ${todayDate}.\n\n`
  text += `🔥 Current Streak: ${streakCount} days\n`
  text += `📋 Tasks Scheduled for Today: ${pendingCount}\n`
  if (overdueCount > 0) {
    text += `⚠️ Overdue Tasks: ${overdueCount}\n`
  }
  text += `\n`

  if (aiRoast) {
    text += `🤖 Coach Message:\n"${aiRoast}"\n\n`
  }

  text += `─── TODAY'S TASKS ───\n`
  if (todayTasks.length === 0) {
    text += `No tasks scheduled for today. Great job or time to add some!\n`
  } else {
    todayTasks.forEach((t, i) => {
      text += `${i + 1}. [ ] ${t.title} (${t.priority.toUpperCase()} | ${t.category})\n`
      if (t.description) text += `   Note: ${t.description}\n`
    })
  }

  if (overdueTasks.length > 0) {
    text += `\n─── OVERDUE TASKS (NEEDS ATTENTION) ───\n`
    overdueTasks.forEach((t, i) => {
      text += `${i + 1}. [!] ${t.title} (Due: ${t.deadline || 'Earlier'} | ${t.priority.toUpperCase()})\n`
    })
  }

  text += `\nKeep your streak burning!\n— CraftPath Productivity Coach`

  // Build HTML Body for FormSubmit / email clients
  let html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FAF7F2; border: 1px solid #E6E0D6; border-radius: 16px; color: #2C2926;">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #EAE4DC; padding-bottom: 16px; margin-bottom: 20px;">
      <div>
        <h1 style="font-size: 20px; font-weight: bold; margin: 0; color: #2C2926;">CraftPath Daily Briefing</h1>
        <p style="font-size: 13px; color: #7A746B; margin: 4px 0 0 0;">${todayDate}</p>
      </div>
      <div style="background: #FFF3E0; border: 1px solid #FFE0B2; border-radius: 20px; padding: 6px 14px; font-size: 14px; font-weight: bold; color: #CC8F3F;">
        🔥 ${streakCount} Day Streak
      </div>
    </div>

    <p style="font-size: 15px; line-height: 1.5; color: #403C35;">
      Hey <strong>${userName || 'Maker'}</strong>, here is your game plan for today!
    </p>
  `

  if (aiRoast) {
    html += `
    <div style="background: #2C2926; color: #FAF7F2; padding: 14px 18px; border-radius: 12px; margin: 16px 0; font-style: italic; font-size: 14px; line-height: 1.5;">
      "${aiRoast}"
    </div>
    `
  }

  html += `
    <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #4F6D52; margin: 24px 0 12px 0;">
      Today's Scheduled Tasks (${pendingCount})
    </h3>
  `

  if (todayTasks.length === 0) {
    html += `<p style="font-size: 13px; color: #8F8A80; font-style: italic;">No pending tasks for today. You're all clear!</p>`
  } else {
    html += `<ul style="list-style: none; padding: 0; margin: 0;">`
    todayTasks.forEach((t) => {
      const pColor = t.priority === 'high' ? '#B24C38' : t.priority === 'medium' ? '#CC8F3F' : '#4F6D52'
      html += `
      <li style="background: #FFFFFF; border: 1px solid #EDE8E0; border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 14px; font-weight: 500; color: #2C2926;">☐ ${t.title}</span>
        <span style="font-size: 11px; font-weight: bold; color: ${pColor}; background: #FAF7F2; padding: 3px 8px; border-radius: 6px; border: 1px solid #EAE4DC;">
          ${t.priority.toUpperCase()} • ${t.category}
        </span>
      </li>
      `
    })
    html += `</ul>`
  }

  if (overdueTasks.length > 0) {
    html += `
      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #B24C38; margin: 24px 0 12px 0;">
        ⚠️ Overdue Tasks (${overdueCount})
      </h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
    `
    overdueTasks.forEach((t) => {
      html += `
      <li style="background: #FFF8F7; border: 1px solid #F7DCD7; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px;">
        <div style="font-size: 13px; font-weight: 600; color: #B24C38;">! ${t.title}</div>
        <div style="font-size: 11px; color: #8F8A80; margin-top: 2px;">Deadline: ${t.deadline || 'Earlier'}</div>
      </li>
      `
    })
    html += `</ul>`
  }

  html += `
    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #EAE4DC; font-size: 12px; color: #8F8A80; text-align: center;">
      Sent with ❤️ from CraftPath • Keep your streak alive!
    </div>
  </div>
  `

  return { subject, textBody: text, htmlBody: html }
}

/**
 * Send real email briefing via FormSubmit AJAX endpoint
 */
export async function sendEmailBriefing(
  toEmail: string,
  userName: string,
  todayDate: string,
  streakCount: number,
  todayTasks: TodoItem[],
  overdueTasks: TodoItem[],
  aiRoast?: string
): Promise<EmailDispatchResult> {
  const cleanEmail = toEmail.trim()
  if (!cleanEmail) {
    return { success: false, message: 'Email address is required.' }
  }

  const { subject, textBody } = formatTaskBriefing(
    userName,
    todayDate,
    streakCount,
    todayTasks,
    overdueTasks,
    aiRoast
  )

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(cleanEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        userName: userName || 'Maker',
        date: todayDate,
        streak: `${streakCount} days`,
        todayTasksCount: todayTasks.length,
        overdueTasksCount: overdueTasks.length,
        tasksSummary: todayTasks.map((t) => `• [${t.priority.toUpperCase()}] ${t.title}`).join('\n') || 'All clear!',
        briefing: textBody,
      }),
    })

    const data = await res.json().catch(() => ({}))
    const msg = (data?.message || '').toLowerCase()

    if (msg.includes('activation') || msg.includes('activate')) {
      return {
        success: true,
        needsActivation: true,
        message:
          'FormSubmit sent a 1-click activation link to your email. Click "Activate Form" in that email once, and your daily briefings will arrive automatically!',
      }
    }

    if (res.ok && (data.success === true || data.success === 'true')) {
      return {
        success: true,
        message: `Briefing sent successfully to ${cleanEmail}!`,
      }
    }

    return {
      success: true,
      message: `Briefing submitted to ${cleanEmail}. Check your inbox!`,
    }
  } catch (err: any) {
    console.error('Failed to send email briefing via FormSubmit:', err)
    return {
      success: false,
      message: `Could not deliver email: ${err.message || 'Network error'}. You can also use "Open in Gmail" below!`,
    }
  }
}

/**
 * Generate a mailto link that pre-fills Gmail / Default mail app
 */
export function getMailtoLink(
  toEmail: string,
  userName: string,
  todayDate: string,
  streakCount: number,
  todayTasks: TodoItem[],
  overdueTasks: TodoItem[],
  aiRoast?: string
): string {
  const { subject, textBody } = formatTaskBriefing(
    userName,
    todayDate,
    streakCount,
    todayTasks,
    overdueTasks,
    aiRoast
  )

  return `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(textBody)}`
}
