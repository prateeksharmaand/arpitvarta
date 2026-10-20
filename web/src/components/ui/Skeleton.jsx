// Shimmering placeholders shown while real data loads.
export function Shimmer({ className = '' }) {
  return <div className={`shimmer rounded-lg ${className}`} aria-hidden="true" />
}

export function ProfessionalCardSkeleton() {
  return (
    <div className="card" role="status" aria-label="Loading professional">
      <div className="flex gap-3">
        <Shimmer className="w-14 h-14 rounded-xl shrink-0" />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          <Shimmer className="h-4 w-3/4" />
          <Shimmer className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Shimmer className="h-6 w-16 rounded-full" />
        <Shimmer className="h-6 w-20 rounded-full" />
      </div>
      <Shimmer className="h-3 w-full mt-4" />
      <div className="flex items-center justify-between mt-5">
        <Shimmer className="h-5 w-16" />
        <div className="flex gap-2">
          <Shimmer className="h-9 w-9 rounded-xl" />
          <Shimmer className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
