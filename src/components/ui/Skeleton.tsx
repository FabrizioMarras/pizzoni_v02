interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse rounded-xl bg-[rgba(43,31,26,0.08)] ${className ?? ''}`} />
}
