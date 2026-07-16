"use client";

import { motion } from "framer-motion";

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export default function SecondaryButton({ onClick, children, className = "", type = "button" }: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      suppressHydrationWarning
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`btn-secondary ${className}`}
    >
      {children}
    </motion.button>
  );
}
