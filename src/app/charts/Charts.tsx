/**
 * Thin, typed wrappers over the vendored Bklit UI charts. The rest of the app imports charts
 * from here only, so the vendor surface stays small and swappable.
 */
import { useMemo, type ReactNode } from 'react'
import type { Sample } from '@/sync/history'
import { BarChart } from '@/vendor/bklit/charts/bar-chart'
import { Bar } from '@/vendor/bklit/charts/bar'
import { BarXAxis } from '@/vendor/bklit/charts/bar-x-axis'
import { BarYAxis } from '@/vendor/bklit/charts/bar-y-axis'
import { Grid } from '@/vendor/bklit/charts/grid'
import { LiveLineChart } from '@/vendor/bklit/charts/live-line-chart'
import { LiveLine } from '@/vendor/bklit/charts/live-line'
import { LiveXAxis } from '@/vendor/bklit/charts/live-x-axis'
import { LiveYAxis } from '@/vendor/bklit/charts/live-y-axis'
import { PieChart } from '@/vendor/bklit/charts/pie-chart'
import { PieSlice } from '@/vendor/bklit/charts/pie-slice'
import { Ring } from '@/vendor/bklit/charts/ring'
import { RingChart } from '@/vendor/bklit/charts/ring-chart'
import { ChartTooltip } from '@/vendor/bklit/charts/tooltip/chart-tooltip'

/** Axis tick label. Note: LiveXAxis passes milliseconds (its docs say seconds). */
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export interface LiveSpeedProps {
  samples: readonly Sample[]
  field: 'dl' | 'up'
  color: string
  format: (v: number) => string
  /** Maximum visible window in seconds; the window grows with the data until it reaches this. */
  window: number
  height: number
  /** X-axis tick count; use 2 in narrow panels. */
  ticks?: number
}

/** Real-time speed line for one direction (download or upload). */
export function LiveSpeed({ samples, field, color, format, window, height, ticks = 3 }: LiveSpeedProps) {
  const data = useMemo(() => samples.map((s) => ({ time: s.t, value: s[field] })), [samples, field])
  const value = data.at(-1)?.value ?? 0
  const span = data.length > 1 ? (data.at(-1)?.time ?? 0) - (data[0]?.time ?? 0) : 0
  const visible = Math.min(window, Math.max(30, Math.ceil(span / 10) * 10))
  return (
    <div className="chartbox" style={{ height }}>
      <LiveLineChart data={data} value={value} window={visible} numXTicks={ticks} style={{ height }} margin={{ top: 12, right: 88, bottom: 28, left: 36 }}>
        <LiveLine dataKey="value" stroke={color} formatValue={format} badge={false} />
        <ChartTooltip showDatePill={false} rows={(p: Record<string, unknown>) => [{ color, label: field === 'dl' ? 'Download' : 'Upload', value: format(Number(p['value'] ?? 0)) }]} />
        <LiveXAxis numTicks={ticks} formatTime={hhmm} />
        <LiveYAxis position="right" formatValue={format} />
      </LiveLineChart>
    </div>
  )
}

export interface RingDatum { label: string; value: number; maxValue: number; color: string }

/** Concentric progress rings with a caller-provided centre. */
export function Rings({ data, size, center, strokeWidth = 10 }: { data: readonly RingDatum[]; size: number; center?: ReactNode; strokeWidth?: number }) {
  return (
    <div className="rings" style={{ width: size, height: size }}>
      <RingChart data={data as RingDatum[]} size={size} strokeWidth={strokeWidth} ringGap={3} padding={4} baseInnerRadius={size / 2 - (strokeWidth + 3) * data.length - 4}>
        {data.map((d, i) => <Ring key={d.label} index={i} color={d.color} />)}
      </RingChart>
      {center && <div className="rings__center">{center}</div>}
    </div>
  )
}

export interface SliceDatum { label: string; value: number; color: string }

/** Donut chart with a caller-provided centre (e.g. a total). */
export function Donut({ data, size, center }: { data: readonly SliceDatum[]; size: number; center?: ReactNode }) {
  return (
    <div className="rings" style={{ width: size, height: size }}>
      <PieChart data={data as SliceDatum[]} size={size} innerRadius={size * 0.32} padAngle={0.02} cornerRadius={3}>
        {data.map((d, i) => <PieSlice key={d.label} index={i} />)}
      </PieChart>
      {center && <div className="rings__center">{center}</div>}
    </div>
  )
}

export interface BarsProps<K extends string> {
  data: readonly ({ [P in K]: number } & { label: string })[]
  dataKey: K
  color: string
  format: (v: number) => string
  orientation: 'horizontal' | 'vertical'
  height: number
}

/** Single-series bar chart with formatted tooltip. */
export function Bars<K extends string>({ data, dataKey, color, format, orientation, height }: BarsProps<K>) {
  const horizontal = orientation === 'horizontal'
  return (
    <div className="chartbox" style={{ height }}>
      <BarChart
        data={data as unknown as Record<string, unknown>[]}
        xDataKey="label"
        orientation={orientation}
        aspectRatio="auto"
        className="h-full"
        margin={horizontal ? { top: 8, right: 24, bottom: 8, left: 110 } : { top: 16, right: 16, bottom: 32, left: 16 }}
      >
        <Grid horizontal={!horizontal} vertical={horizontal} />
        <Bar dataKey={dataKey} fill={color} lineCap={4} />
        {horizontal ? <BarYAxis /> : <BarXAxis showAllLabels />}
        <ChartTooltip rows={(p: Record<string, unknown>) => [{ color, label: String(p['label'] ?? ''), value: format(Number(p[dataKey] ?? 0)) }]} />
      </BarChart>
    </div>
  )
}
