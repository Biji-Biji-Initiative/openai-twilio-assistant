"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  indeterminate?: boolean;
  error?: boolean;
  label?: string;
  description?: string;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, indeterminate, error, label, description, ...props }, ref) => {
  const [isIndeterminate, setIsIndeterminate] = React.useState(indeterminate)

  React.useEffect(() => {
    setIsIndeterminate(indeterminate)
  }, [indeterminate])

  return (
    <div className="flex items-start space-x-2">
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive",
          className
        )}
        onCheckedChange={(checked) => {
          if (checked !== "indeterminate") {
            setIsIndeterminate(false)
          }
          props.onCheckedChange?.(checked)
        }}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn("flex items-center justify-center text-primary-foreground")}
        >
          {isIndeterminate ? (
            <Minus className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description) && (
        <div className="grid gap-1.5 leading-none">
          {label && (
            <label
              htmlFor={props.id}
              className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                error && "text-destructive"
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
