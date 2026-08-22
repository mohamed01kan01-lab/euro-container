/** Bandeau défilant en boucle (CSS pur, voir globals.css `.animate-marquee`). */
export function Marquee({ words }: { words: string[] }) {
    const line = (
        <>
            {words.map((w, i) => (
                <span key={i} className="inline-flex items-center gap-8 sm:gap-11">
                    <span>{w}</span>
                    <span className="text-orange-300" aria-hidden>
                        ★
                    </span>
                </span>
            ))}
        </>
    );

    return (
        <div className="overflow-hidden whitespace-nowrap bg-primary py-3">
            <div className="animate-marquee inline-flex gap-8 pr-8 font-display text-lg uppercase tracking-wide text-primary-foreground sm:gap-11 sm:pr-11 sm:text-xl">
                {line}
                {line}
            </div>
        </div>
    );
}
