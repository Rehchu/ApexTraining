import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#00E676] text-[#0A0A0A] font-bold hover:bg-primary/90 border-none transition-all hover: hover:-translate-y-0.5",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 border-none transition-all",
        outline:
          "border border-primary/20 bg-transparent hover:bg-primary/10 text-foreground transition-all hover:border-primary/40",
        secondary:
          "bg-secondary backdrop-blur-md text-foreground hover:bg-secondary border border-primary/20 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)]",
        ghost: "hover:bg-accent hover:text-foreground text-muted-foreground transition-all",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2 rounded-xl",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }