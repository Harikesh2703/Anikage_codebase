import { Skeleton } from "@/components/ui/skeleton";

export function HomeScreenSkeleton() {
  return (
    <div className="pb-20 animate-in fade-in duration-300">
      {/* Hero Spotlight Skeleton */}
      <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden bg-card/40 border-b border-border/20">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent z-10" />

        <div className="relative z-20 h-full flex flex-col justify-end pb-20 px-6 md:px-14 max-w-3xl space-y-4">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Skeleton className="h-10 md:h-12 w-3/4 max-w-lg rounded-lg" />
            <Skeleton className="h-6 w-1/2 max-w-sm rounded-lg" />
          </div>

          {/* Tags */}
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          {/* Description */}
          <div className="space-y-2 max-w-xl pt-1">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-3">
            <Skeleton className="h-11 w-36 rounded-xl" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
        </div>
      </section>

      {/* Rows Skeletons */}
      <div className="-mt-12 relative z-10 space-y-10">
        {/* Row 1: Continue Watching / Trending */}
        <div className="px-6 md:px-10">
          <div className="mb-4 space-y-1.5">
            <Skeleton className="h-7 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[170px] md:w-[190px] aspect-[2/3] rounded-xl overflow-hidden bg-card/60 p-3 flex flex-col justify-end space-y-2"
              >
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Shonen & Action */}
        <div className="px-6 md:px-10">
          <div className="mb-4 space-y-1.5">
            <Skeleton className="h-7 w-52 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[170px] md:w-[190px] aspect-[2/3] rounded-xl overflow-hidden bg-card/60 p-3 flex flex-col justify-end space-y-2"
              >
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Slice of Life */}
        <div className="px-6 md:px-10">
          <div className="mb-4 space-y-1.5">
            <Skeleton className="h-7 w-40 rounded-md" />
            <Skeleton className="h-4 w-60 rounded-md" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[170px] md:w-[190px] aspect-[2/3] rounded-xl overflow-hidden bg-card/60 p-3 flex flex-col justify-end space-y-2"
              >
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

