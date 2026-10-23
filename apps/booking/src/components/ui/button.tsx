import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-md font-medium tracking-[0.014em] transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover",
        secondary: "border border-line bg-white text-ink hover:bg-sunk",
        "secondary-primary": "border border-line bg-white text-primary hover:bg-sunk",
        danger: "border border-line bg-sunk text-error hover:bg-error-50",
        ghost: "text-muted hover:bg-sunk hover:text-ink",
      },
      size: {
        sm: "h-9 px-[18px] text-sm",
        md: "h-11 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonStyles>;

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & Variants) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: React.ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
