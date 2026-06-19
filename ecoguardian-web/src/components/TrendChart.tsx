import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

interface TrendChartProps {
  data: { day: string; value: number }[];
}

function getBarColor(value: number): string {
  if (value > 14) return '#154212';
  if (value > 10) return '#2d5a27';
  return '#e6e9e7';
}

function getTextColor(value: number): string {
  if (value > 14) return '#154212';
  if (value > 10) return '#2d5a27';
  return '#42493e';
}

interface LabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
}

function RenderLabel(props: LabelProps) {
  const { x = 0, y = 0, width = 0, value = 0 } = props;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill={getTextColor(value)}
      textAnchor="middle"
      fontSize={12}
      fontWeight={600}
      fontFamily="Inter, sans-serif"
    >
      {value}
    </text>
  );
}

export default function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 24, right: 4, left: 4, bottom: 0 }}
        barCategoryGap="20%"
      >
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#42493e', fontFamily: 'Inter, sans-serif' }}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #e6e9e7',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
          }}
          formatter={(val: any) => [`${val} kg`, 'CO₂']}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.value)} />
          ))}
          <LabelList dataKey="value" content={RenderLabel as any} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
