import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  className,
  tagline = true,
  reversed = false,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  tagline?: boolean;
  reversed?: boolean;
}) {
  const showTag = tagline && size !== "sm";
  const src = reversed ? "/brand/logo-reversed-white.svg" : "/brand/logo-primary-horizontal.svg";
  const heights = { sm: 22, md: 28, lg: 36, xl: 48 } as const;
  return (
    <span className={cn("brand", className)}>
      <img
        src={src}
        alt="CINEVO"
        height={heights[size]}
        className="brand__img"
        style={{ height: heights[size], width: "auto" }}
      />
      {showTag ? <small className="brand__tag">Private cinema, reinvented</small> : null}
    </span>
  );
}
