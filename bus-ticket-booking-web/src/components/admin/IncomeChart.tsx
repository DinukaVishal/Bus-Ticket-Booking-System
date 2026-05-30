import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Booking } from '@/types/booking';

interface IncomeChartProps {
  bookings: Booking[];
}

const IncomeChart = ({ bookings }: IncomeChartProps) => {
  const chartData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    
    bookings
      .filter(b => b.status === 'confirmed')
      .forEach(b => {
        const date = new Date(b.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = (monthlyData[key] || 0) + 1;
      });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        bookings: count,
      }));
  }, [bookings]);

  return (
    <div className="bg-card rounded-xl shadow-card border p-6">
      <h2 className="text-lg font-display font-semibold mb-4">Booking Trends</h2>
      {chartData.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No booking data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default IncomeChart;
