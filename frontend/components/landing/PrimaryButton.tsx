"use client";

import { motion, HTMLMotionProps } from "framer-motion";

interface ButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
}

export default function PrimaryButton({ children, className = "", type = "button", ...rest }: ButtonProps) {
  return (
    <motion.button
      type={type}
      suppressHydrationWarning
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`btn-primary ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
