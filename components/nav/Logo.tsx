export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const wordmarkSize = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];
  const taglineSize = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
  }[size];

  return (
    <div className="flex flex-col leading-none">
      <span
        className={`font-brand font-medium text-gold ${wordmarkSize} tracking-[0.2em]`}
      >
        SOLAE
      </span>
      <span
        className={`font-brand text-gold-dim ${taglineSize} tracking-[0.3em] mt-1`}
      >
        LONGEVITY &amp; SOUL STUDIO
      </span>
    </div>
  );
}
