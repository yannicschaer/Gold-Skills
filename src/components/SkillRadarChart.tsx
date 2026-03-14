import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'

interface SkillDataPoint {
  name: string
  ist: number
  soll: number
}

interface Props {
  data: SkillDataPoint[]
}

export function SkillRadarChart({ data }: Props) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="var(--color-sand-300)" strokeOpacity={0.5} />
        <PolarAngleAxis
          dataKey="name"
          tick={{ fill: 'var(--color-forest-950)', fontSize: 11, fontFamily: 'var(--font-body)' }}
          tickLine={false}
        />
        <PolarRadiusAxis
          domain={[0, 10]}
          tickCount={6}
          tick={{ fill: 'var(--color-neutral-400)', fontSize: 10 }}
          axisLine={false}
        />
        <Radar
          name="Soll"
          dataKey="soll"
          stroke="var(--color-mint-300)"
          fill="var(--color-mint-200)"
          fillOpacity={0.15}
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <Radar
          name="Ist"
          dataKey="ist"
          stroke="var(--color-mint-500)"
          fill="var(--color-mint-400)"
          fillOpacity={0.3}
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-forest-950)', stroke: 'var(--color-mint-500)', strokeWidth: 1.5 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
