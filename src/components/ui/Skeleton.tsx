interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse rounded-xl bg-[rgba(var(--ink-rgb),0.08)] ${className ?? ''}`} />
}
