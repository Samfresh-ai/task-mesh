export function MiniSparkline({
  values,
  className = "",
}: {
  values: number[];
  className?: string;
}) {
  const points = values.length === 0 ? [0] : values;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coordinates = points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className}>
      <polyline
        fill="none"
        stroke="url(#spark)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coordinates}
      />
      <defs>
        <linearGradient id="spark" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#2fa2ff" />
          <stop offset="100%" stopColor="#2ad28a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
