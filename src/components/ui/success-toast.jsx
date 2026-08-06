import { toast } from "sonner";

/**
 * Show a styled success popup for 3 seconds.
 * @param {string} message - The success message to display
 * @param {string} [description] - Optional description
 */
export function showSuccess(message, description) {
  toast.success(message, {
    description,
    duration: 3000,
    style: {
      background: "linear-gradient(135deg, #0a2e1a, #0d3d22)",
      border: "1px solid rgba(34,197,94,0.4)",
      color: "#4ade80",
      boxShadow: "0 0 20px rgba(34,197,94,0.2)",
    },
    classNames: {
      title: "text-green-400 font-bold",
      description: "text-green-300/70",
      icon: "text-green-400",
    },
  });
}