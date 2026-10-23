import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-cobalt-600 text-white hover:bg-cobalt-700",
        secondary: "border border-line bg-white text-ink hover:bg-sunk",
        ghost: "text-muted hover:bg-sunk hover:text-ink",
        danger: "text-danger hover:bg-orange-50",
        "danger-outline": "border border-line bg-white text-error-ink hover:bg-error-50",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
