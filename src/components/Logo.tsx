/* eslint-disable @next/next/no-img-element */
// Logomarca Lucas Bento. Em tema escuro, o PNG verde ganha um fundo claro para manter contraste.
export function Logo({ variant = "mark", className = "h-9" }: { variant?: "mark" | "full"; className?: string }) {
  return (
    <span className="inline-flex items-center rounded-lg dark:bg-paper dark:p-1">
      <img src={variant === "full" ? "/brand/logo-full.png" : "/brand/logo-mark.png"} alt="Lucas Bento Nutricionista" className={`${className} w-auto`} />
    </span>
  );
}
