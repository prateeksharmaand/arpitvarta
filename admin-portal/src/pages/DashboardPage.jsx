import React, { useEffect, useState } from 'react';
import { Users, Star, MessageSquare, Wallet, Clock, TrendingUp, Activity, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import api from '../services/api';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import { StatCardShimmer, ShimmerBlock } from '../components/Shimmer';

const fmt = (n) => new Intl.NumberFormat('en-IN').format(n);
const fmtRs = (n) => `₹${new Intl.NumberFormat('en-IN').format(n)}`;

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8">
      <PageHeader title="Dashboard" subtitle="Platform overview" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, i) => <StatCardShimmer key={i} />)}
      </div>
      <div className="card">
        <ShimmerBlock className="h-4 w-48 mb-4" />
        <ShimmerBlock className="h-[220px] w-full" />
      </div>
    </div>
  );
  if (!data) return null;

  const chartData = data.dau_chart.map((d) => ({
    date: format(new Date(d.date), 'MMM d'),
    users: parseInt(d.active_users),
  }));

  return (
    <div className="p-8">
      <PageHeader title="Dashboard" subtitle="Platform overview" />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}         label="Total Users"            value={fmt(data.total_users)}           color="blue" />
        <StatCard icon={Star}          label="Active Professionals"     value={fmt(data.active_professionals)}    color="gold" />
        <StatCard icon={MessageSquare} label="Total Consultations"    value={fmt(data.total_consultations)}   color="purple" />
        <StatCard icon={Wallet}        label="Wallet in Circulation"  value={fmtRs(data.wallet_balance_in_circulation)} color="green" />
        <Link to="/professionals"><StatCard icon={Clock} label="Pending Approvals" value={fmt(data.pending_professionals)} sub="Professionals awaiting review" color="brand" /></Link>
        <StatCard icon={TrendingUp}    label="Revenue (This Month)"   value={fmtRs(data.revenue_this_month)}  color="green" />
        <StatCard icon={Activity}      label="DAU"                    value={fmt(data.dau)}                   sub="Daily active users" color="blue" />
        <StatCard icon={Activity}      label="MAU"                    value={fmt(data.mau)}                   sub="Monthly active users" color="purple" />
        <StatCard icon={Sparkles}      label="AI Assistant Queries"   value={fmt(data.ai_queries_30d || 0)}   sub="Last 30 days" color="gold" />
      </div>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">Professionals & Consultations by Category</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={(data.by_category || []).map(c => ({ name: `${c.icon} ${c.name}`, professionals: c.professionals, consultations: c.consultations }))} margin={{ bottom: 60 }}>
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} labelStyle={{ color: '#aaa' }} cursor={{ fill: '#ffffff08' }} />
            <Bar dataKey="professionals" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            <Bar dataKey="consultations" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Daily Active Users — Last 30 Days</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }}
                labelStyle={{ color: '#aaa' }}
                itemStyle={{ color: '#7C3AED' }}
              />
              <Area type="monotone" dataKey="users" stroke="#7C3AED" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-sm text-center py-10">No activity data yet</p>
        )}
      </div>
    </div>
  );
}
