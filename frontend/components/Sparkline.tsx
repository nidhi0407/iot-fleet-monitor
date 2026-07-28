type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
};

// A deliberately simple hand-rolled sparkline instead of a charting
// library -- for readings history this is all the chart needs to be,
// and it keeps the dependency list honest.
export default function Sparkline({
  values,
  width = 160,
  height = 40,
  stroke = "var(--signal-cyan)",
}: SparklineProps) {
  if (values.length < 2) {
    return <svg width={width} height={height} className="sparkline sparkline--empty" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="sparkline" viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
