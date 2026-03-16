"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-dark/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl bg-white p-6 shadow-xl",
            "data-[state=open]:animate-fade-up",
            "focus:outline-none",
            className
          )}
        >
          {title && (
            <Dialog.Title className="mb-1 text-[20px] font-bold text-text tracking-[-0.02em]">
              {title}
            </Dialog.Title>
          )}
          {description && (
            <Dialog.Description className="mb-5 text-[14px] text-text2">
              {description}
            </Dialog.Description>
          )}
          {children}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-text3 transition-colors hover:bg-surface hover:text-text"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { Modal };
