import { cn } from "@/lib/utils";

type AppPageShellProps = {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "narrow";
  paddingY?: "default" | "loose";
};

export function AppPageShell({
  children,
  className,
  width = "default",
  paddingY = "default",
}: AppPageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl px-6",
        paddingY === "loose" ? "py-10" : "py-8",
        className,
      )}
    >
      {width === "narrow" ? (
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
