import { z } from 'zod';

export const usernameSchema = z
  .string()
  .regex(/^[A-Za-z]{2,30}$/, 'Username must be 2–30 English letters');

export const passwordSchema = z.string().min(6);

export const householdCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{6}$/, 'Household code must be 6 letters');

export const phoneSchema = z
  .string()
  .min(7)
  .max(20)
  .refine((v) => /^\+?\d[\d\s()-]*$/.test(v), 'Enter a valid phone number');

/** Online signup — discriminated by mode (D49–D51). */
export const registerOnlineSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('phone'),
    code: householdCodeSchema,
    username: usernameSchema,
    password: passwordSchema,
    phone: phoneSchema,
  }),
  z.object({
    mode: z.literal('google'),
    code: householdCodeSchema,
    /** OAuth authorization code exchanged server-side; never an id_token from the client. */
    oauthCode: z.string().min(1),
    redirectUri: z.string().url(),
  }),
]);

export const loginSchema = z.object({
  code: householdCodeSchema,
  username: usernameSchema,
  password: z.string().min(1),
});

export const switchProfileSchema = z.object({
  personId: z.string().uuid(),
  password: z.string().min(1).optional(),
});

export const linkGoogleSchema = z.object({
  oauthCode: z.string().min(1),
  redirectUri: z.string().url(),
  currentPassword: z.string().min(1),
});

export type RegisterOnlineInput = z.infer<typeof registerOnlineSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SwitchProfileInput = z.infer<typeof switchProfileSchema>;
export type LinkGoogleInput = z.infer<typeof linkGoogleSchema>;
