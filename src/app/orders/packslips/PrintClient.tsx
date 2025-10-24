"use client";
import { useEffect } from "react";

export default function PrintClient() {
  useEffect(() => {
    // give the images a tick to load
    const t = setTimeout(() => {
      try { window.print(); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}
