import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Join class names, letting later Tailwind classes override earlier ones */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
