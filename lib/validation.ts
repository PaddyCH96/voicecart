import { z } from 'zod';

export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number');

export const otpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.email || data.phone, {
  message: 'Email or phone required',
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email').optional(),
});

export const uploadAudioSchema = z.object({
  language: z.string().length(2).default('hi'),
});

export const processAdSchema = z.object({
  adId: z.string().uuid('Invalid ad ID'),
  language: z.string().length(2).default('hi'),
});

export const translateTextSchema = z.object({
  text: z.string().min(1, 'Text required'),
  targetLang: z.string().length(2, 'Language code required'),
});

export const translateVoiceSchema = z.object({
  adId: z.string().uuid('Invalid ad ID'),
  targetLang: z.string().length(2, 'Language code required'),
  text: z.string().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name required').max(200),
  type: z.enum(['audio', 'video']),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  assets: z.any().optional(),
  status: z.string().optional(),
});

export const createOrderSchema = z.object({
  amount: z.number().int().min(1).max(100).default(1),
});

export const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const consumeCreditSchema = z.object({
  adId: z.string().uuid('Invalid ad ID'),
});

export const subscriptionCreateSchema = z.object({
  plan: z.literal('pro'),
});

export const assetUploadSchema = z.object({
  type: z.enum(['image', 'video', 'audio']).optional(),
});

export const omnipostSchema = z.object({
  transcript: z.string().min(1, 'Transcript required').max(5000),
  language: z.string().length(2, 'Language code required').default('hi'),
});
