'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type BulletinState = { error: string | null; ok: boolean }

// Tiny inline profanity filter — meant as a guardrail, not a fortress.
// Owner-posted content is reviewed less than user-posted, so this is light.
const PROFANITY = ['fuck', 'shit', 'cunt', 'bitch', 'asshole']

const schema = z.object({
  campground_id: z.string().uuid(),
  message: z.string().min(1).max(280),
  category: z.enum(['event', 'special', 'alert', 'general']),
  duration: z.enum(['today', '3days', '1week']),
})

function expiryFor(duration: 'today' | '3days' | '1week'): Date {
  const now = new Date()
  const out = new Date(now)
  if (duration === 'today') {
    out.setHours(23, 59, 59, 999)
  } else if (duration === '3days') {
    out.setDate(out.getDate() + 3)
  } else {
    out.setDate(out.getDate() + 7)
  }
  return out
}

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase()
  return PROFANITY.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower))
}

export async function postBulletinAction(
  _prev: BulletinState,
  formData: FormData,
): Promise<BulletinState> {
  const parsed = schema.safeParse({
    campground_id: formData.get('campground_id'),
    message: formData.get('message'),
    category: formData.get('category'),
    duration: formData.get('duration'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first = Object.values(flat.fieldErrors).flat()[0] ?? 'Invalid input'
    return { error: String(first), ok: false }
  }

  if (containsProfanity(parsed.data.message)) {
    return { error: 'Please keep bulletins family-friendly.', ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  // "Only one active bulletin at a time" — wipe any unexpired existing
  // bulletins for this campground before inserting the new one.
  await supabase
    .from('bulletins')
    .delete()
    .eq('campground_id', parsed.data.campground_id)
    .or(
      `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`,
    )

  const { error } = await supabase.from('bulletins').insert({
    campground_id: parsed.data.campground_id,
    message: parsed.data.message,
    category: parsed.data.category,
    posted_by: user.id,
    expires_at: expiryFor(parsed.data.duration).toISOString(),
  })
  if (error) return { error: error.message, ok: false }

  revalidatePath('/owner/bulletin')
  revalidatePath('/owner/dashboard')
  revalidatePath('/home')
  return { error: null, ok: true }
}

export async function deleteBulletinAction(formData: FormData) {
  const id = formData.get('id')
  if (typeof id !== 'string') return
  const supabase = await createSupabaseServerClient()
  await supabase.from('bulletins').delete().eq('id', id)
  revalidatePath('/owner/bulletin')
  revalidatePath('/owner/dashboard')
  revalidatePath('/home')
}
