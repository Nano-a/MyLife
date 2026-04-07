'use client'

import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  delay?: number
  glowing?: boolean
  gradientBorder?: boolean
  onClick?: () => void
}

export function AnimatedCard({
  children,
  className,
  style,
  delay = 0,
  glowing = false,
  gradientBorder = false,
  onClick,
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-4 transition-all duration-500',
        'hover:bg-[oklch(0.18_0.02_240/0.5)] hover:border-[oklch(0.45_0.02_260/0.35)]',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        glowing && 'glow',
        gradientBorder && 'gradient-border',
        onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  )
}

export function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color = 'primary',
  progress,
  onClick,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string | number
  subtitle?: string
  color?: 'primary' | 'accent' | 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5'
  progress?: number
  onClick?: () => void
  delay?: number
}) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    'chart-1': 'text-chart-1 bg-chart-1/10',
    'chart-2': 'text-chart-2 bg-chart-2/10',
    'chart-3': 'text-chart-3 bg-chart-3/10',
    'chart-4': 'text-chart-4 bg-chart-4/10',
    'chart-5': 'text-chart-5 bg-chart-5/10',
  }
  
  const glowClasses = {
    primary: 'drop-shadow-[0_0_8px_var(--primary)]',
    accent: 'drop-shadow-[0_0_8px_var(--accent)]',
    'chart-1': 'drop-shadow-[0_0_8px_var(--chart-1)]',
    'chart-2': 'drop-shadow-[0_0_8px_var(--chart-2)]',
    'chart-3': 'drop-shadow-[0_0_8px_var(--chart-3)]',
    'chart-4': 'drop-shadow-[0_0_8px_var(--chart-4)]',
    'chart-5': 'drop-shadow-[0_0_8px_var(--chart-5)]',
  }
  
  return (
    <AnimatedCard onClick={onClick} delay={delay} className="group">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl', colorClasses[color])}>
          <Icon className={cn('w-5 h-5 transition-all duration-300 group-hover:scale-110', glowClasses[color])} />
        </div>
        {progress !== undefined && (
          <span className="text-xs font-medium text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-out',
              color === 'primary' && 'bg-primary',
              color === 'accent' && 'bg-accent',
              color === 'chart-1' && 'bg-chart-1',
              color === 'chart-2' && 'bg-chart-2',
              color === 'chart-3' && 'bg-chart-3',
              color === 'chart-4' && 'bg-chart-4',
              color === 'chart-5' && 'bg-chart-5'
            )}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </AnimatedCard>
  )
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = 'primary',
  children,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'fill-none transition-all duration-1000 ease-out',
            color === 'primary' && 'stroke-primary',
            color === 'accent' && 'stroke-accent',
            color === 'chart-1' && 'stroke-chart-1',
            color === 'chart-2' && 'stroke-chart-2'
          )}
          style={{
            filter: `drop-shadow(0 0 8px var(--${color}))`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
