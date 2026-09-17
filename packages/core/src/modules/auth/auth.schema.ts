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

/**
 * POST /auth/household-preview (D101 step-down login, additive): resolves
 * whether a household code exists and which faces (people) its members pick
 * from. Uniform NOT_FOUND mirrors the login contract — no code enumeration.
 */
export const householdPreviewSchema = z.object({ code: householdCodeSchema });

export const householdPreviewResponseSchema = z.object({
  householdId: z.string().uuid(),
  householdName: z.string().min(1),
  faces: z.array(
    z.object({
      personId: z.string().uuid(),
      name: z.string().min(1),
      avatarEmoji: z.string().nullable(),
      /** Faces with a password demand one; passwordless faces switch in. */
      hasPassword: z.boolean(),
    }),
  ),
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
/** POST /auth/google — OAuth code exchange replaces the password form (D50). */
export const googleLoginSchema = z.object({
  oauthCode: z.string().min(1),
  redirectUri: z.string().url(),
});

export type RegisterOnlineInput = z.infer<typeof registerOnlineSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type HouseholdPreviewInput = z.infer<typeof householdPreviewSchema>;
export type HouseholdPreviewResponse = z.infer<typeof householdPreviewResponseSchema>;
export type SwitchProfileInput = z.infer<typeof switchProfileSchema>;
export type LinkGoogleInput = z.infer<typeof linkGoogleSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
