import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react"

import { cn } from "@/shared/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-[400px] outline-none",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-2xl",
    "bg-white dark:bg-zinc-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ring-1",
    "transition-all duration-300",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[swipe=end]:animate-out data-[swipe=move]:transition-none",
    "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full",
    "data-[state=open]:slide-in-from-right-full",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "ring-blue-100 dark:ring-blue-900/40 [--accent:theme(colors.blue.500)] [--accent-bg:theme(colors.blue.50)] [--accent-dark:theme(colors.blue.900/20)]",
        success:
          "ring-emerald-100 dark:ring-emerald-900/40 [--accent:theme(colors.emerald.500)] [--accent-bg:theme(colors.emerald.50)] [--accent-dark:theme(colors.emerald.900/20)]",
        warning:
          "ring-amber-100 dark:ring-amber-900/40 [--accent:theme(colors.amber.500)] [--accent-bg:theme(colors.amber.50)] [--accent-dark:theme(colors.amber.900/20)]",
        error:
          "ring-red-100 dark:ring-red-900/40 [--accent:theme(colors.red.500)] [--accent-bg:theme(colors.red.50)] [--accent-dark:theme(colors.red.900/20)]",
        destructive:
          "ring-red-100 dark:ring-red-900/40 [--accent:theme(colors.red.500)] [--accent-bg:theme(colors.red.50)] [--accent-dark:theme(colors.red.900/20)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export const TOAST_ICONS: Record<string, React.ElementType> = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  destructive: XCircle,
}

export const TOAST_ICON_COLORS: Record<string, string> = {
  default: "text-blue-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
  destructive: "text-red-500",
}

export const TOAST_PROGRESS_COLORS: Record<string, string> = {
  default: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  destructive: "bg-red-500",
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "rounded-lg p-1 text-zinc-400 opacity-0 transition-all hover:text-zinc-600 focus:opacity-100 focus:outline-none group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
