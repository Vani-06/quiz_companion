export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Display-only colour banding for the proficiency chart.
export function strengthOf(score) {
  if (score >= 80) return "strong";
  if (score >= 70) return "average";
  return "weak";
}
