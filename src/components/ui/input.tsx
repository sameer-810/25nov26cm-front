import * as React from "react"

import { cn } from "@/lib/utils"

// Date and time fields open the browser's calendar or clock on a click anywhere in the field,
// not only on the small icon. Any past or future date can be picked unless a field sets min/max.
const PICKER_TYPES = new Set(["date", "time", "datetime-local", "month", "week"])

function openPicker(event: React.MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget
  if (input.disabled || input.readOnly || typeof input.showPicker !== "function") return
  try {
    input.showPicker()
  } catch {
    // Some browsers refuse outside a direct user gesture; the field still works by typing.
  }
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onClick, ...props }, ref) => {
    const picker = !!type && PICKER_TYPES.has(type)
    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        onClick={picker ? (event) => { openPicker(event); onClick?.(event) } : onClick}
        className={cn(
          picker && "cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
