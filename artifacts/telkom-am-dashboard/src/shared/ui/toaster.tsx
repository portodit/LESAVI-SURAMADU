import * as React from "react"
import { useToast } from "@/shared/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  TOAST_ICONS,
  TOAST_ICON_COLORS,
  TOAST_PROGRESS_COLORS,
} from "@/shared/ui/toast"

const DEFAULT_DURATION = 3000

function ProgressBar({ duration, variant }: { duration: number; variant: string }) {
  const barColor = TOAST_PROGRESS_COLORS[variant] ?? TOAST_PROGRESS_COLORS.default
  return (
    <div className="h-0.5 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
      <div
        className={`h-full ${barColor} origin-left`}
        style={{
          animation: `toast-shrink ${duration}ms linear forwards`,
        }}
      />
    </div>
  )
}

function ToastItem({
  id,
  title,
  description,
  action,
  variant,
  detail,
  duration = DEFAULT_DURATION,
  ...props
}: {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: string | null
  detail?: string
  duration?: number
  [key: string]: any
}) {
  const v = variant ?? "default"
  const isError = v === "error" || v === "destructive"
  const Icon = TOAST_ICONS[v] ?? TOAST_ICONS.default
  const iconColor = TOAST_ICON_COLORS[v] ?? TOAST_ICON_COLORS.default

  const lastClickRef = React.useRef<number>(0)
  const [copied, setCopied] = React.useState(false)

  const handleClick = () => {
    if (!isError) return
    const now = Date.now()
    if (now - lastClickRef.current < 450) {
      const text = detail ?? [title, description].filter(Boolean).join("\n")
      navigator.clipboard
        .writeText(typeof text === "string" ? text : String(text))
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(() => {})
    }
    lastClickRef.current = now
  }

  return (
    <Toast
      variant={v as any}
      duration={duration}
      onClick={handleClick}
      className={isError ? "cursor-pointer select-none" : ""}
      {...props}
    >
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="mt-0.5 shrink-0">
          <Icon className={`h-[18px] w-[18px] ${iconColor}`} strokeWidth={2.2} />
        </div>

        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {isError && !copied && (
            <p className="text-[10px] text-zinc-400 mt-1.5 select-none">
              Klik 2× untuk menyalin detail error
            </p>
          )}
          {copied && (
            <p className="text-[10px] text-emerald-500 mt-1.5 font-medium">
              ✓ Detail error disalin ke clipboard
            </p>
          )}
        </div>

        <div className="shrink-0 -mt-0.5 -mr-1">
          <ToastClose />
        </div>
      </div>

      {action && <div className="px-4 pb-3">{action}</div>}

      <ProgressBar duration={duration} variant={v} />
    </Toast>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={DEFAULT_DURATION}>
      {toasts.map(({ id, title, description, action, variant, detail, duration, ...props }) => (
        <ToastItem
          key={id}
          id={id}
          title={title}
          description={description}
          action={action}
          variant={variant}
          detail={detail}
          duration={duration ?? DEFAULT_DURATION}
          {...props}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
