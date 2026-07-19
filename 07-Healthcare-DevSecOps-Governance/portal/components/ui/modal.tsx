"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode } from "react";
import { Button } from "./button";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl" initial={{ y: 16, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, scale: 0.98 }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5"><h2 className="font-semibold">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog"><X className="size-4" /></Button></div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

