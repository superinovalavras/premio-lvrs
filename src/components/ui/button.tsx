import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// No estilo shadcn/ui: variantes via cva, classes mescladas com cn().
// Botão padrão da marca: fundo amarelo, texto verde-escuro, retângulo arredondado.
export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amarelo focus-visible:ring-offset-2 focus-visible:ring-offset-fundo disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        glow:
          "bg-amarelo text-fundo hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-6px_color-mix(in_oklab,var(--amarelo)_70%,transparent)]",
        verde: "bg-verde text-white hover:-translate-y-0.5 hover:bg-[#0f8f52]",
        outline: "border-2 border-white/25 text-white hover:border-amarelo hover:text-amarelo",
        ghost: "text-white/80 hover:bg-white/10 hover:text-white",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: { variant: "glow", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
