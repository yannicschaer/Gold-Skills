import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

const FEATURE_PILLS = ['Skill-Matrix', 'Team-Übersicht', 'Radar-Charts', 'Ist vs. Soll']

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left: Login Form */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-clip p-[80px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-[32px] w-[400px]">
          {/* Logo */}
          <div className="flex items-center justify-center size-[48px] bg-forest-950 rounded-[8px] overflow-clip">
            <img src="/logo-gold-dark.svg" alt="Gold" className="w-[34px] h-[24px]" />
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-[8px]">
            <h1 className="font-heading text-[28px] font-medium leading-[1.3] tracking-[-0.2px] text-forest-950">
              Willkommen bei Gold Skills
            </h1>
            <p className="font-body text-[16px] leading-[1.5] text-neutral-700">
              Melde dich an, um deine Skills zu verwalten und die
              Teamübersicht einzusehen.
            </p>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-[20px]">
            {error && (
              <div className="bg-coral-50 border border-coral-200 text-coral-600 px-[14px] py-[12px] rounded-[8px] font-body text-[14px]">
                {error}
              </div>
            )}

            {/* E-Mail */}
            <div className="flex flex-col gap-[6px]">
              <label
                htmlFor="email"
                className="font-body text-[14px] leading-[1.5] tracking-[0.2px] text-neutral-700"
              >
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@goldinteractive.ch"
                className="w-full rounded-[8px] border border-neutral-200 bg-white px-[14px] py-[12px]
                           font-body text-[16px] leading-[1.5] text-forest-950
                           placeholder:text-neutral-400
                           focus:outline-none focus:border-mint-400 focus:ring-1 focus:ring-mint-400"
              />
            </div>

            {/* Passwort */}
            <div className="flex flex-col gap-[6px]">
              <label
                htmlFor="password"
                className="font-body text-[14px] leading-[1.5] tracking-[0.2px] text-neutral-700"
              >
                Passwort
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-[8px] border border-neutral-200 bg-white px-[14px] py-[12px]
                           font-body text-[16px] leading-[1.5] text-forest-950
                           placeholder:text-neutral-400
                           focus:outline-none focus:border-mint-400 focus:ring-1 focus:ring-mint-400"
              />
            </div>

            {/* Passwort vergessen */}
            <button
              type="button"
              className="self-start font-body text-[14px] leading-[1.5] text-neutral-500 hover:text-forest-950 hover:underline"
            >
              Passwort vergessen?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[8px] bg-mint-400 py-[14px]
                       font-body text-[16px] leading-[1.5] tracking-[0.2px] text-forest-950
                       hover:bg-mint-500 focus:outline-none focus:ring-2
                       focus:ring-mint-400 focus:ring-offset-2
                       disabled:opacity-50 transition-colors"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>

      {/* Right: Splash Panel */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center
                      bg-forest-950 rounded-tl-[24px] rounded-bl-[24px] p-[80px] overflow-clip">
        <div className="flex flex-col items-center gap-[32px] w-[480px]">
          {/* Decoration */}
          <div className="size-[320px]">
            <img src="/decoration-radar.svg" alt="" className="size-full" />
          </div>

          {/* Title */}
          <h2 className="font-heading text-[36px] font-medium leading-[1.2] tracking-[-0.3px] text-white text-center">
            Gold Skills
          </h2>

          {/* Subtitle */}
          <p className="font-body text-[18px] leading-[1.5] text-sand-200 text-center">
            Erfasse und visualisiere die Skills
            <br />
            deines Teams — transparent und einfach.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-[8px]">
            {FEATURE_PILLS.map((label) => (
              <span
                key={label}
                className="border border-forest-700 rounded-[999px] px-[14px] py-[6px]
                           font-body text-[12px] leading-[1.5] text-sand-200 opacity-70"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
