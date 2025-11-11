import type { BuilderCategory } from "@/lib/builder-analytics";

interface TrophyIconProps {
  category: BuilderCategory;
  className?: string;
}

export function TrophyIcon({ category, className = "" }: TrophyIconProps) {
  if (!category) return null;

  const colors = {
    most_earnings: "text-yellow-500",
    trending: "text-orange-500",
    highest_score: "text-blue-500",
    featured: "text-purple-500",
    sought_after: "text-green-500",
  };

  return (
    <svg
      className={`w-5 h-5 ${colors[category]} ${className}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2L9 7h6l-3-5z" />
      <path d="M7 7h10v2c0 2.5-1.5 4.5-4 5v4h2v2H9v-2h2v-4c-2.5-.5-4-2.5-4-5V7z" />
      <path d="M5 7H3v2c0 3 2 5 5 5v-2c-2 0-3-1-3-3V7zM19 7v2c0 2-1 3-3 3v2c3 0 5-2 5-5V7h-2z" />
    </svg>
  );
}

