"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
      },
      size: {
        default: "min-h-[80px] px-3 py-2 text-sm",
        sm: "min-h-[60px] px-2 py-1 text-xs",
        lg: "min-h-[120px] px-4 py-3 text-base",
      },
      resize: {
        none: "resize-none",
        vertical: "resize-y",
        horizontal: "resize-x",
        both: "resize",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      resize: "vertical",
    },
  }
)

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size" | "value">,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
  success?: boolean;
  maxLength?: number;
  showCount?: boolean;
  autoGrow?: boolean;
  value?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    variant,
    size,
    resize,
    error,
    success,
    maxLength,
    showCount,
    autoGrow,
    value = "",
    onChange,
    ...props
  }, ref) => {
    const [localValue, setLocalValue] = React.useState(value)
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

    React.useEffect(() => {
      setLocalValue(value)
    }, [value])

    React.useEffect(() => {
      if (autoGrow && textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [localValue, autoGrow])

    // Determine variant based on error/success props
    const computedVariant = error
      ? "error"
      : success
      ? "success"
      : variant

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (maxLength && newValue.length > maxLength) {
        return
      }
      setLocalValue(newValue)
      onChange?.(e)
    }

    return (
      <div className="relative">
        <textarea
          ref={(element) => {
            // Handle both refs
            if (typeof ref === "function") {
              ref(element)
            } else if (ref) {
              ref.current = element
            }
            textareaRef.current = element
          }}
          value={localValue}
          onChange={handleChange}
          className={cn(textareaVariants({ variant: computedVariant, size, resize }), className)}
          {...props}
        />
        {showCount && maxLength && (
          <div className="absolute bottom-1.5 right-1.5 text-xs text-muted-foreground">
            {localValue.length}/{maxLength}
          </div>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
