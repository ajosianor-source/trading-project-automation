"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Never hide server-rendered content before hydration. This keeps the console usable
  // under strict CSP, slow networks, and browsers with JavaScript temporarily blocked.
  return <motion.div key={pathname} initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>{children}</motion.div>;
}
