import { z } from 'zod'

export const signupSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]{3,24}$/, 'Username: 3-24 letters, numbers, or underscores'),
  accept: z
    .boolean()
    .refine((v) => v === true, { message: 'You must accept the Terms and Privacy Policy' }),
})

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

export const resendSchema = z.object({
  email: z.email('Enter a valid email address'),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
