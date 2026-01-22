import * as React from "react"
import { useTranslation } from "react-i18next"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

import { animate } from "animejs"

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const overlayRef = React.useRef<HTMLDivElement>(null)
  
  React.useImperativeHandle(ref, () => overlayRef.current as HTMLDivElement)

  React.useEffect(() => {
    if (!overlayRef.current) return

    // Enter
    animate(overlayRef.current, {
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutQuad'
    })

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const newState = (mutation.target as HTMLElement).getAttribute('data-state')
          if (newState === 'closed') {
            animate(overlayRef.current!, {
              opacity: [1, 0],
              duration: 200,
              easing: 'easeInQuad'
            })
          }
        }
      })
    })

    observer.observe(overlayRef.current, { attributes: true })
    return () => observer.disconnect()
  }, [])

  return (
    <DialogPrimitive.Overlay
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-50 bg-black/80",
        // Remove default animations to let anime.js take over, avoiding conflicts
        // But keep them if we want Radix to wait? 
        // Radix waits for animationend. If we remove classes, Radix might unmount explicitly?
        // Let's keep a dummy class or just keep original ones but overwrite visuals.
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  // Merge refs
  React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement)

  React.useEffect(() => {
    if (!contentRef.current) return

    // Enter - Elastic Pop
    animate(contentRef.current, {
      scale: [0.9, 1],
      opacity: [0, 1],
      translateY: ['-50%', '-50%'], // Keep centered vertically
      translateX: ['-50%', '-50%'], // Keep centered horizontally
      duration: 600,
      easing: 'easeOutElastic(1, .5)',
      delay: 100 // Slight delay after overlay
    })

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const newState = (mutation.target as HTMLElement).getAttribute('data-state')
          if (newState === 'closed') {
            // Exit - Drop down
            animate(contentRef.current!, {
              scale: [1, 0.95],
              opacity: [1, 0],
              translateY: ['-50%', '-45%'], // Drop down slightly
              translateX: ['-50%', '-50%'],
              duration: 200,
              easing: 'easeInQuad'
            })
          }
        }
      })
    })

    observer.observe(contentRef.current, { attributes: true })
    return () => observer.disconnect()
  }, [])

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
          // Keep animate attributes so Radix waits for unmount, but visuals handled by anime.js
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className
        )}
        {...props}
      >
        {children}
        <DialogCloseBtn />
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogCloseBtn = () => {
  const { t } = useTranslation()
  return (
    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
      <X className="h-4 w-4" />
      <span className="sr-only">{t('common.close')}</span>
    </DialogPrimitive.Close>
  )
}

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
