import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const meetupCreateSchema = z
  .object({
    campground_id: z.string().regex(UUID, 'Invalid campground id'),
    title: z.string().trim().min(1, 'Title is required').max(120),
    description: optionalText(1000),
    location: optionalText(120),
    start_at: z.string().min(1, 'Pick a start time'),
    end_at: z
      .string()
      .transform((v) => (v.length === 0 ? null : v))
      .nullable(),
  })
  .refine(
    (d) => {
      if (!d.end_at) return true
      const start = new Date(d.start_at).getTime()
      const end = new Date(d.end_at).getTime()
      return Number.isFinite(start) && Number.isFinite(end) && end > start
    },
    { message: 'End time must be after start time', path: ['end_at'] },
  )

export type MeetupCreateInput = z.infer<typeof meetupCreateSchema>
