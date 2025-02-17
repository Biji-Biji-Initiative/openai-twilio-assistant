import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "",
        destructive: "border-destructive",
        ghost: "border-0 shadow-none bg-transparent",
      },
      padding: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        none: "p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "div" : "div"
    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, padding }), className)}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "default" | "sm" | "lg";
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, spacing = "default", ...props }, ref) => {
    const spacingClasses = {
      default: "space-y-1.5 p-6",
      sm: "space-y-1 p-4",
      lg: "space-y-2 p-8",
    }[spacing]

    return (
      <div
        ref={ref}
        className={cn("flex flex-col", spacingClasses, className)}
        {...props}
      />
    )
  }
)
CardHeader.displayName = "CardHeader"

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: "default" | "sm" | "lg";
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeClasses = {
      default: "text-2xl",
      sm: "text-xl",
      lg: "text-3xl",
    }[size]

    return (
      <h3
        ref={ref}
        className={cn(
          sizeClasses,
          "font-semibold leading-none tracking-tight",
          className
        )}
        {...props}
      />
    )
  }
)
CardTitle.displayName = "CardTitle"

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "default" | "sm" | "lg";
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeClasses = {
      default: "text-sm",
      sm: "text-xs",
      lg: "text-base",
    }[size]

    return (
      <p
        ref={ref}
        className={cn(sizeClasses, "text-muted-foreground", className)}
        {...props}
      />
    )
  }
)
CardDescription.displayName = "CardDescription"

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "default" | "sm" | "lg";
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, spacing = "default", ...props }, ref) => {
    const spacingClasses = {
      default: "p-6 pt-0",
      sm: "p-4 pt-0",
      lg: "p-8 pt-0",
    }[spacing]

    return (
      <div ref={ref} className={cn(spacingClasses, className)} {...props} />
    )
  }
)
CardContent.displayName = "CardContent"

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "default" | "sm" | "lg";
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, spacing = "default", ...props }, ref) => {
    const spacingClasses = {
      default: "flex items-center p-6 pt-0",
      sm: "flex items-center p-4 pt-0",
      lg: "flex items-center p-8 pt-0",
    }[spacing]

    return (
      <div ref={ref} className={cn(spacingClasses, className)} {...props} />
    )
  }
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
