import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: 
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface BaseBadgeProps extends VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

interface BadgeDivProps extends BaseBadgeProps, Omit<React.HTMLAttributes<HTMLDivElement>, keyof BaseBadgeProps> {
  clickable?: false;
}

interface BadgeButtonProps extends BaseBadgeProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseBadgeProps> {
  clickable: true;
  onClick?: () => void;
}

export type BadgeProps = BadgeDivProps | BadgeButtonProps;

const Badge = React.forwardRef<HTMLDivElement | HTMLButtonElement, BadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => {
    const styles = cn(
      badgeVariants({ variant, size }),
      className
    );

    if ('clickable' in props && props.clickable) {
      const { clickable, onClick, ...rest } = props;
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          className={cn(styles, "cursor-pointer hover:opacity-80")}
          onClick={onClick}
          type="button"
          {...rest}
        >
          {icon && <span className="mr-1">{icon}</span>}
          {children}
        </button>
      );
    }

    const { clickable, ...rest } = props as BadgeDivProps;
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={styles}
        {...rest}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </div>
    );
  }
);

Badge.displayName = "Badge"

export { Badge, badgeVariants }
