"use client";

import {
  motion,
  useReducedMotion,
} from "motion/react";
import type {
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type MotionFadeProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function MotionFade({
  children,
  className,
  delay = 0,
}: MotionFadeProps) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      className={cn(
        className
      )}
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 6,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration:
          reduceMotion
            ? 0
            : 0.2,
        delay:
          reduceMotion
            ? 0
            : delay,
        ease: [
          0.2,
          0.8,
          0.2,
          1,
        ],
      }}
    >
      {children}
    </motion.div>
  );
}
