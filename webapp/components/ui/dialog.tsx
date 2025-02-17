"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DialogProps extends DialogPrimitive.DialogProps {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent) => void;
  onInteractOutside?: (event: Event) => void;
}

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

export interface DialogOverlayProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
  blur?: boolean;
  dark?: boolean;
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, blur, dark, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      blur && "backdrop-blur-sm",
      dark ? "bg-black/80" : "bg-black/50",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: "default" | "sm" | "lg" | "xl" | "full";
  showClose?: boolean;
  closeClassName?: string;
  overlayProps?: DialogOverlayProps;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ 
  className, 
  children, 
  size = "default",
  showClose = true,
  closeClassName,
  overlayProps,
  ...props 
}, ref) => {
  const sizeClasses = {
    default: "sm:max-w-lg",
    sm: "sm:max-w-sm",
    lg: "sm:max-w-xl",
    xl: "sm:max-w-2xl",
    full: "sm:max-w-[calc(100vw-2rem)]",
  }[size]

  return (
    <DialogPortal>
      <DialogOverlay {...overlayProps} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          sizeClasses,
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
              closeClassName
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "default" | "sm" | "lg";
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, spacing = "default", ...props }, ref) => {
    const spacingClasses = {
      default: "space-y-1.5",
      sm: "space-y-1",
      lg: "space-y-2",
    }[spacing]

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col text-center sm:text-left",
          spacingClasses,
          className
        )}
        {...props}
      />
    );
  }
);
DialogHeader.displayName = "DialogHeader";

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "default" | "sm" | "lg";
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, spacing = "default", ...props }, ref) => {
    const spacingClasses = {
      default: "sm:space-x-2",
      sm: "sm:space-x-1",
      lg: "sm:space-x-3",
    }[spacing]

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col-reverse sm:flex-row sm:justify-end",
          spacingClasses,
          className
        )}
        {...props}
      />
    );
  }
);
DialogFooter.displayName = "DialogFooter";

export interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
  size?: "default" | "sm" | "lg";
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  DialogTitleProps
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    default: "text-lg",
    sm: "text-base",
    lg: "text-xl",
  }[size]

  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        sizeClasses,
        "font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  );
});
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {
  size?: "default" | "sm" | "lg";
}

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    default: "text-sm",
    sm: "text-xs",
    lg: "text-base",
  }[size]

  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn(
        sizeClasses,
        "text-muted-foreground",
        className
      )}
      {...props}
    />
  );
});
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
