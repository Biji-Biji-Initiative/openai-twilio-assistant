"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, X } from "lucide-react"

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        ghost: "border-none shadow-none",
        error: "border-destructive",
        success: "border-green-500",
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-8 px-2 py-1 text-xs",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  error?: boolean;
  success?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  clearable?: boolean;
  onClear?: () => void;
  passwordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    variant,
    size,
    error,
    success,
    icon,
    iconPosition = "left",
    clearable,
    onClear,
    passwordToggle,
    disabled,
    value,
    onChange,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [localValue, setLocalValue] = React.useState(value || "")

    React.useEffect(() => {
      setLocalValue(value || "")
    }, [value])

    // Determine variant based on error/success props
    const computedVariant = error
      ? "error"
      : success
      ? "success"
      : variant

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value)
      onChange?.(e)
    }

    const handleClear = () => {
      setLocalValue("")
      onClear?.()
      // Trigger onChange with empty value
      const event = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(event)
    }

    const inputType = passwordToggle
      ? showPassword ? "text" : "password"
      : type

    return (
      <div className="relative">
        <input
          type={inputType}
          className={cn(
            inputVariants({ variant: computedVariant, size }),
            icon && iconPosition === "left" && "pl-10",
            icon && iconPosition === "right" && "pr-10",
            (clearable || passwordToggle) && "pr-10",
            className
          )}
          ref={ref}
          disabled={disabled}
          value={localValue}
          onChange={handleChange}
          {...props}
        />
        
        {/* Icon */}
        {icon && (
          <div
            className={cn(
              "absolute top-0 flex h-full items-center text-muted-foreground",
              iconPosition === "left" ? "left-3" : "right-3"
            )}
          >
            {icon}
          </div>
        )}

        {/* Clear button */}
        {clearable && localValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Password toggle */}
        {passwordToggle && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
