'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Ghost, MapPin } from 'lucide-react'
import {
  saveProfileAction,
  type ProfileSaveState,
} from '@/app/(app)/profile/setup/actions'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { Eyebrow } from '@/components/ui/eyebrow'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { TRAVEL_STYLES } from '@/lib/constants/travel-styles'
import type { Profile, PrivacyMode } from '@/lib/types/db'

const initialState: ProfileSaveState = { error: null, ok: false }

type Props = {
  userId: string
  profile: Profile | null
  interests: { slug: string; label: string; emoji: string }[]
  myInterestSlugs: string[]
}

export function ProfileForm({ userId, profile, interests, myInterestSlugs }: Props) {
  const [state, formAction, pending] = useActionState(saveProfileAction, initialState)

  // Diagnostic for the "RLS at save time" reports. Runs once when the
  // user submits the form, BEFORE the action fires. Prints what the
  // browser supabase client thinks the current user is, so we can
  // compare it to the server action's view of the same submit.
  // The actual write goes through saveProfileAction (server action) —
  // there is no browser-side write to public.profiles anywhere.
  async function logBrowserAuthOnSubmit() {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('[profile-save] browser auth at submit:', {
        propUserId: userId,
        browserUserId: userData?.user?.id ?? null,
        browserUserEmail: userData?.user?.email ?? null,
        match: userData?.user?.id === userId,
        getUserError: userError?.message ?? null,
      })
    } catch (err) {
      console.log('[profile-save] browser auth check threw:', err)
    }
  }
  const [hasPets, setHasPets] = useState(profile?.has_pets ?? false)
  const [travelStyle, setTravelStyle] = useState<string>(profile?.travel_style ?? '')
  // Controlled so we can validate "non-empty" client-side and disable
  // the Save button without round-tripping the form.
  const [displayName, setDisplayName] = useState<string>(profile?.display_name ?? '')
  const displayNameTrimmed = displayName.trim()
  const displayNameValid = displayNameTrimmed.length > 0

  const initial = (
    profile?.display_name?.[0] ??
    profile?.username?.[0] ??
    '?'
  ).toUpperCase()

  return (
    <form
      action={formAction}
      onSubmit={() => {
        // Fire-and-forget — the form still submits via formAction whether
        // this completes or not. The console.log lands in the browser's
        // devtools, not Vercel logs, so it's visible client-side at
        // failure time without affecting the action.
        void logBrowserAuthOnSubmit()
      }}
      className="space-y-8"
    >
      <AvatarUpload
        userId={userId}
        initialUrl={profile?.avatar_url ?? null}
        displayInitial={initial}
      />

      <Section eyebrow="Public name">
        <FieldRow>
          <Label>Display name</Label>
          <input
            name="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={40}
            aria-invalid={!displayNameValid}
            className={inputCls}
            placeholder="What other campers will see"
          />
          {!displayNameValid && (
            <p className="mt-1 text-xs text-red-300">
              Pick a display name — what other campers will see.
            </p>
          )}
        </FieldRow>
      </Section>

      <Section eyebrow="About your rig" hint="Each row has its own share toggle.">
        <ToggleRow
          label="Rig type"
          name="rig_type"
          shareName="share_rig_type"
          defaultValue={profile?.rig_type ?? ''}
          defaultShare={profile?.share_rig_type ?? true}
          placeholder="Class B, travel trailer, fifth wheel…"
          maxLength={60}
        />
        <ToggleRow
          label="Miles driven"
          name="miles_driven"
          shareName="share_miles_driven"
          defaultValue={profile?.miles_driven?.toString() ?? ''}
          defaultShare={profile?.share_miles_driven ?? true}
          type="number"
          placeholder="0"
        />
        <ToggleRow
          label="Hometown"
          name="hometown"
          shareName="share_hometown"
          defaultValue={profile?.hometown ?? ''}
          defaultShare={profile?.share_hometown ?? true}
          placeholder="Boise, ID"
          maxLength={80}
        />
        <ToggleRow
          label="Years RVing"
          name="years_rving"
          shareName="share_years"
          defaultValue={profile?.years_rving?.toString() ?? ''}
          defaultShare={profile?.share_years ?? true}
          type="number"
          placeholder="0"
        />
      </Section>

      <Section eyebrow="Travel style" hint="Pick the one that fits best. Click again to clear.">
        <FieldRow>
          <ShareToggle
            name="share_travel_style"
            defaultChecked={profile?.share_travel_style ?? true}
            label="Share my travel style"
          />
        </FieldRow>
        <input type="hidden" name="travel_style" value={travelStyle} />
        <div className="flex flex-wrap gap-2 mt-2">
          {TRAVEL_STYLES.map((t) => {
            const active = travelStyle === t.slug
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() =>
                  setTravelStyle((prev) => (prev === t.slug ? '' : t.slug))
                }
                className={
                  active
                    ? 'rounded-full bg-flame px-3 py-1.5 text-sm font-semibold text-night shadow-md shadow-flame/20'
                    : 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-cream hover:border-flame/40'
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </Section>

      <Section eyebrow="Right now">
        <ToggleRow
          label="Status tag"
          name="status_tag"
          shareName="share_status"
          defaultValue={profile?.status_tag ?? ''}
          defaultShare={profile?.share_status ?? true}
          placeholder="Open to chat, Reading by the fire, Cooking dinner…"
          maxLength={40}
        />
        <ToggleRow
          label="Personal note"
          name="personal_note"
          shareName="share_note"
          defaultValue={profile?.personal_note ?? ''}
          defaultShare={profile?.share_note ?? true}
          textarea
          placeholder="A line or two about you. Up to 280 characters."
          maxLength={280}
        />
      </Section>

      <Section eyebrow="Pets">
        <FieldRow>
          <Label>
            <input
              type="checkbox"
              name="has_pets"
              checked={hasPets}
              onChange={(e) => setHasPets(e.target.checked)}
              className="mr-2 h-4 w-4 accent-flame"
            />
            I travel with pets
          </Label>
        </FieldRow>
        {hasPets && (
          <ToggleRow
            label="Pet info"
            name="pet_info"
            shareName="share_pet"
            defaultValue={profile?.pet_info ?? ''}
            defaultShare={profile?.share_pet ?? true}
            placeholder="2 dogs (golden retriever, beagle)"
            maxLength={120}
          />
        )}
      </Section>

      <Section eyebrow="Interests" hint="Used by the nearby filter.">
        <FieldRow>
          <ShareToggle
            name="share_interests"
            defaultChecked={profile?.share_interests ?? true}
            label="Share my interests"
          />
        </FieldRow>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {interests.map((i) => (
            <label
              key={i.slug}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-card p-4 cursor-pointer has-checked:border-flame has-checked:bg-flame/10 transition-colors"
            >
              <span className="text-3xl leading-none select-none" aria-hidden>
                {i.emoji}
              </span>
              <span className="flex-1 font-semibold text-cream">{i.label}</span>
              <input
                type="checkbox"
                name="interest_slugs"
                value={i.slug}
                defaultChecked={myInterestSlugs.includes(i.slug)}
                className="h-5 w-5 accent-flame"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section eyebrow="Privacy mode" hint="You can change this anytime.">
        <PrivacyModeRadio defaultValue={profile?.privacy_mode ?? 'visible'} />
      </Section>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-leaf/40 bg-leaf/10 p-3 text-sm text-leaf"
        >
          Saved. Your profile is up to date.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !displayNameValid}
        className="w-full sm:w-auto rounded-lg bg-flame text-night px-5 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}

function Section({
  eyebrow,
  hint,
  children,
}: {
  eyebrow: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="contents">
        <Eyebrow>{eyebrow}</Eyebrow>
      </legend>
      {hint && <p className="text-xs text-mist">{hint}</p>}
      {children}
    </fieldset>
  )
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-cream">{children}</label>
}

function ToggleRow({
  label,
  name,
  shareName,
  defaultValue,
  defaultShare,
  placeholder,
  maxLength,
  type = 'text',
  textarea,
}: {
  label: string
  name: string
  shareName: string
  defaultValue?: string
  defaultShare: boolean
  placeholder?: string
  maxLength?: number
  type?: string
  textarea?: boolean
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-start">
      <Label>{label}</Label>
      <ShareToggle name={shareName} defaultChecked={defaultShare} label="Share" />
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          className={`${inputCls} col-span-2 resize-y`}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          min={type === 'number' ? 0 : undefined}
          className={`${inputCls} col-span-2`}
        />
      )}
    </div>
  )
}

function ShareToggle({
  name,
  defaultChecked,
  label,
}: {
  name: string
  defaultChecked: boolean
  label: string
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-mist cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="relative inline-block h-5 w-9 rounded-full bg-white/10 peer-checked:bg-flame transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-cream after:transition-transform peer-checked:after:translate-x-4 after:shadow" />
      <span>{label}</span>
    </label>
  )
}

function PrivacyModeRadio({ defaultValue }: { defaultValue: PrivacyMode }) {
  const options: {
    value: PrivacyMode
    label: string
    description: string
    Icon: typeof Eye
  }[] = [
    {
      value: 'visible',
      label: 'Visible',
      Icon: Eye,
      description: 'In the list. Open to waves.',
    },
    {
      value: 'quiet',
      label: 'Quiet',
      Icon: EyeOff,
      description: 'Hidden, but you can wave first.',
    },
    {
      value: 'invisible',
      label: 'Invisible',
      Icon: Ghost,
      description: 'Just here to look around.',
    },
    {
      value: 'campground_updates_only',
      label: 'Campground Updates Only',
      Icon: MapPin,
      description:
        'See bulletins + meetups, completely invisible to other campers.',
    },
  ]
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const Icon = o.Icon
        return (
          <label
            key={o.value}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-card p-3 cursor-pointer has-checked:border-flame has-checked:bg-flame/10"
          >
            <input
              type="radio"
              name="privacy_mode"
              value={o.value}
              defaultChecked={defaultValue === o.value}
              className="mt-1 h-4 w-4 accent-flame"
            />
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-flame/10 text-flame">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-cream">{o.label}</span>
              <span className="block text-xs text-mist">{o.description}</span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'
