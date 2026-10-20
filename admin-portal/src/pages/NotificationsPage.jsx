import React, { useState } from 'react';
import { Send } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [mode, setMode]     = useState('broadcast');
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [segment, setSegment] = useState({ subscription_plan: '', city: '' });
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!title.trim() || !body.trim()) return toast.error('Title and body are required');
    setLoading(true);
    try {
      const endpoint = mode === 'broadcast' ? '/notifications/broadcast' : '/notifications/segment';
      const payload  = { title, body };
      if (mode === 'segment') {
        payload.segment = {
          subscription_plan: segment.subscription_plan || undefined,
          city: segment.city.trim() || undefined,
        };
      }
      const res = await api.post(endpoint, payload);
      toast.success(`Sent to ${res.data.sent} device(s)`);
      setTitle(''); setBody('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Push Notifications" subtitle="Send to users via FCM" />

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {['broadcast', 'segment'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${mode === m ? 'bg-brand text-white' : 'bg-surface-light text-text-secondary hover:text-white'}`}
          >
            {m === 'broadcast' ? '📢 Broadcast (All Users)' : '🎯 Targeted Segment'}
          </button>
        ))}
      </div>

      <div className="card space-y-4">
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block">Title</label>
          <input className="input" placeholder="Notification title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block">Message</label>
          <textarea className="input h-24 resize-none" placeholder="Notification body…" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        {mode === 'segment' && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Subscription Plan</label>
              <select className="input" value={segment.subscription_plan} onChange={(e) => setSegment(s => ({ ...s, subscription_plan: e.target.value }))}>
                <option value="">All plans</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">City</label>
              <input className="input" placeholder="All cities (e.g. Mumbai)" value={segment.city} onChange={(e) => setSegment(s => ({ ...s, city: e.target.value }))} />
            </div>
          </div>
        )}

        <button
          onClick={send}
          disabled={loading}
          className="btn-primary flex items-center gap-2 w-full justify-center mt-2"
        >
          <Send size={16} />
          {loading ? 'Sending…' : mode === 'broadcast' ? 'Send to All Users' : 'Send to Segment'}
        </button>
      </div>

      <div className="mt-6 card bg-surface">
        <h3 className="text-sm font-semibold text-white mb-3">Segment Filters Reference</h3>
        <ul className="space-y-1.5 text-xs text-text-secondary">
          <li><span className="text-text-primary">Broadcast</span> — sends to every registered device token</li>
          <li><span className="text-text-primary">Subscription Plan</span> — target free / basic / premium users</li>
          <li><span className="text-text-primary">City</span> — target users in a city (e.g. to announce new local professionals)</li>
          <li><span className="text-text-primary">Combined</span> — multiple filters are ANDed together</li>
        </ul>
      </div>
    </div>
  );
}
