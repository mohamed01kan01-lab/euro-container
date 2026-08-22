export function SectionEyebrow({
    children,
    invert = false,
    center = false,
}: {
    children: React.ReactNode;
    invert?: boolean;
    center?: boolean;
}) {
    return (
        <p
            className={[
                "mb-3 font-heading text-xs font-semibold uppercase tracking-[0.2em]",
                invert ? "text-orange-400" : "text-orange-600",
                center ? "text-center" : "",
            ].join(" ")}
        >
            {children}
        </p>
    );
}
