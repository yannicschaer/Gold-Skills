import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useContentStore } from '@/store/content'

const DEFAULT_FEATURE_PILLS = ['Skill-Matrix', 'Team-Übersicht', 'Radar-Charts', 'Ist vs. Soll']

interface Dot {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  opacity: number
  color: string
}

function AnimatedRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 320
    canvas.width = size
    canvas.height = size
    const cx = size / 2
    const cy = size / 2

    // Initialize dots at random positions inside the outer ring
    const ringRadius = 139.25
    const rng = () => (Math.random() - 0.5) * 0.3
    function randomInsideRing(dotR: number) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * (ringRadius - dotR)
      return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist }
    }
    const dotDefs: { r: number; opacity: number; color: string }[] = [
      { r: 8, opacity: 0.6, color: '#6ADC89' },
      { r: 4, opacity: 0.5, color: '#9CE8B0' },
      { r: 5, opacity: 0.45, color: '#6ADC89' },
      { r: 6, opacity: 0.35, color: '#9CE8B0' },
      { r: 3, opacity: 0.5, color: '#6ADC89' },
      { r: 4, opacity: 0.4, color: '#9CE8B0' },
      { r: 5, opacity: 0.3, color: '#6ADC89' },
    ]
    dotsRef.current = dotDefs.map((d) => {
      const pos = randomInsideRing(d.r)
      return { ...d, ...pos, vx: rng(), vy: rng() }
    })

    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)

      // Draw concentric circles (grid)
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#225759'
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.arc(cx, cy, 139.25, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = '#2D7476'
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(cx, cy, 99.25, 0, Math.PI * 2)
      ctx.stroke()

      // Draw accent glow (stationary)
      ctx.globalAlpha = 0.15
      ctx.fillStyle = '#6ADC89'
      ctx.beginPath()
      ctx.arc(240, 90, 60, 0, Math.PI * 2)
      ctx.fill()

      // Animate dots — constrained inside the outer ring
      for (const dot of dotsRef.current) {
        dot.x += dot.vx
        dot.y += dot.vy

        // Distance from center
        const dx = dot.x - cx
        const dy = dot.y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = ringRadius - dot.r

        if (dist > maxDist) {
          // Normalize the direction from center to dot
          const nx = dx / dist
          const ny = dy / dist
          // Push dot back inside the ring
          dot.x = cx + nx * maxDist
          dot.y = cy + ny * maxDist
          // Reflect velocity off the ring boundary (inward)
          const dotVn = dot.vx * nx + dot.vy * ny
          dot.vx -= 2 * dotVn * nx
          dot.vy -= 2 * dotVn * ny
        }

        ctx.globalAlpha = dot.opacity
        ctx.fillStyle = dot.color
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="size-full"
      style={{ width: 320, height: 320 }}
    />
  )
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuthStore()
  const { loginPage, fetchLoginPage } = useContentStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchLoginPage()
  }, [fetchLoginPage])

  const heading = loginPage?.heading ?? 'Willkommen bei Gold Skills'
  const subtitle = loginPage?.subtitle ?? 'Melde dich an, um deine Skills zu verwalten und die Teamübersicht einzusehen.'
  const emailPlaceholder = loginPage?.emailPlaceholder ?? 'name@goldinteractive.ch'
  const splashTitle = loginPage?.splashTitle ?? 'Gold Skills'
  const splashSubtitle = loginPage?.splashSubtitle ?? 'Erfasse und visualisiere die Skills deines Teams — transparent und einfach.'
  const featurePills = loginPage?.featurePills ?? DEFAULT_FEATURE_PILLS

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
      <div className="flex flex-1 flex-col items-center justify-center overflow-clip px-6 py-12 sm:p-[80px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-[32px] w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex items-center justify-center size-[48px] bg-forest-950 rounded-[8px] overflow-clip">
            <img src="/logo-gold-dark.svg" alt="Gold" className="w-[34px] h-[24px]" />
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-[8px]">
            <h1 className="font-heading text-[28px] font-medium leading-[1.3] tracking-[-0.2px] text-forest-950">
              {heading}
            </h1>
            <p className="font-body text-[16px] leading-[1.5] text-neutral-700">
              {subtitle}
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
                placeholder={emailPlaceholder}
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
            <AnimatedRadar />
          </div>

          {/* Title */}
          <h2 className="font-heading text-[36px] font-medium leading-[1.2] tracking-[-0.3px] text-white text-center">
            {splashTitle}
          </h2>

          {/* Subtitle */}
          <p className="font-body text-[18px] leading-[1.5] text-sand-200 text-center">
            {splashSubtitle}
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-[8px]">
            {featurePills.map((label) => (
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
