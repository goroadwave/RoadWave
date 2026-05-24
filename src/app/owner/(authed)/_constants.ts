// Shared constants for the owner-(authed) shell. Lives in its own
// file because 'use server' files can only export async functions,
// so the cookie name can't sit next to the action that writes it.

export const OWNER_CAMPGROUND_COOKIE = 'roadwave_owner_cg'
