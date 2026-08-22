import { Skeleton } from "@/components/ui/skeleton";

export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
    return (
        <section className="w-full bg-card rounded-2xl shadow-md p-6">
            <header className="mb-6 space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
            </header>

            <div className="space-y-4">
                {Array.from({ length: fields }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                ))}
                <Skeleton className="h-9 w-full mt-2" />
            </div>
        </section>
    );
}
