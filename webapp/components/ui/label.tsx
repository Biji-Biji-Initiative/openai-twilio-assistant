"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-foreground",
        error: "text-destructive",
        success: "text-green-500",
        muted: "text-muted-foreground",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
      },
      weight: {
        default: "font-medium",
        normal: "font-normal",
        semibold: "font-semibold",
        bold: "font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      weight: "default",
    },
  }
)

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  error?: boolean;
  success?: boolean;
  optional?: boolean;
  optionalText?: string;
  tooltip?: string;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({
  className,
  variant,
  size,
  weight,
  error,
  success,
  optional,
  optionalText = "Optional",
  tooltip,
  children,
  ...props
}, ref) => {
  // Determine variant based on error/success props
  const computedVariant = error
    ? "error"
    : success
    ? "success"
    : variant

  return (
    <div className="flex items-center gap-1">
      <LabelPrimitive.Root
        ref={ref}
        className={cn(
          labelVariants({ variant: computedVariant, size, weight }),
          className
        )}
        {...props}
      >
        {children}
        {optional && (
          <span className="ml-1 text-muted-foreground">
            ({optionalText})
          </span>
        )}
      </LabelPrimitive.Root>
      {tooltip && (
        <div
          className="cursor-help text-muted-foreground hover:text-foreground"
          title={tooltip}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12" y2="17" />
          </svg>
        </div>
      )}
    </div>
  )
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label, labelVariants }
