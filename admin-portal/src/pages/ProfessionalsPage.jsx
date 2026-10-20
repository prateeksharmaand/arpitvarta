import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Edit2, Ban, ShieldCheck, Eye, Search, FileText } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { format } from 'date-fns';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { TableShimmer } from '../components/Shimmer';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${new Intl.NumberFormat('en-IN').format(parseFloat(n) || 0)}`;

function RatesModal({ professional, onClose, onSaved }) {
  const [chat, setChat]   = useState(professional.per_minute_rate_chat);
  const [call, setCall]   = useState(professional.per_minute_rate_call);
  const [video, setVideo] = useState(professional.per_minute_rate_video);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await api.put(`/professionals/${professional.id}/rates`, {
        per_minute_rate_chat: parseFloat(chat),
        per_minute_rate_call: parseFloat(call),
        per_minute_rate_video: parseFloat(video),
      });
      toast.success('Rates updated');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to update rates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm">
        <h3 className="font-semibold text-white mb-4">Set Rates — {professional.display_name}</h3>
        {[['Chat (₹/min)', chat, setChat], ['Call (₹/min)', call, setCall], ['Video (₹/min)', video, setVideo]].map(([label, val, set]) => (
          <div key={label} className="mb-3">
            <label className="text-xs text-text-secondary mb-1 block">{label}</label>
            <input type="number" className="input" value={val} onChange={(e) => set(e.target.value)} min="1" />
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ professional: a, categories, onClose, onSaved }) {
  const [categoryId, setCategoryId] = useState(a.category_id || '');
  const docs = Array.isArray(a.documents) ? a.documents : [];
  const saveCategory = async () => {
    try {
      await api.put(`/professionals/${a.id}/category`, { category_id: categoryId ? parseInt(categoryId) : null });
      toast.success('Category updated');
      onSaved();
    } catch { toast.error('Failed to update category'); }
  };
  const Field = ({ label, value }) => (
    <div><p className="text-xs text-text-muted">{label}</p><p className="text-sm text-white mt-0.5">{value || '—'}</p></div>
  );
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl my-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white text-lg">{a.display_name}</h3>
            <p className="text-text-secondary text-sm">{a.profession_title || 'Professional'} · {a.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-light"><X size={16} className="text-text-muted" /></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <Field label="Experience" value={a.experience_years ? `${a.experience_years} years` : null} />
          <Field label="License / Registration No." value={a.license_number} />
          <Field label="Organisation" value={a.organization} />
          <Field label="City" value={a.city} />
          <Field label="Phone" value={a.phone} />
          <Field label="Languages" value={(a.languages || []).join(', ')} />
        </div>
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-1.5">Qualifications</p>
          <div className="flex flex-wrap gap-1.5">
            {(a.qualifications || []).length ? a.qualifications.map(q => <span key={q} className="px-2.5 py-0.5 bg-surface-light rounded-full text-xs text-text-secondary">{q}</span>) : <span className="text-sm text-text-muted">—</span>}
          </div>
        </div>
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-1.5">Specialisations</p>
          <div className="flex flex-wrap gap-1.5">
            {(a.specializations || []).length ? a.specializations.map(q => <span key={q} className="px-2.5 py-0.5 bg-brand/10 text-brand rounded-full text-xs">{q}</span>) : <span className="text-sm text-text-muted">—</span>}
          </div>
        </div>
        {a.bio && <div className="mb-4"><p className="text-xs text-text-muted mb-1.5">Bio</p><p className="text-sm text-text-secondary leading-relaxed">{a.bio}</p></div>}
        <div className="mb-5">
          <p className="text-xs text-text-muted mb-1.5">Verification documents</p>
          {docs.length ? (
            <div className="flex flex-wrap gap-2">
              {docs.map((d, i) => (
                <a key={d} href={d} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light text-xs text-text-secondary hover:text-white">
                  <FileText size={13} /> Document {i + 1}
                </a>
              ))}
            </div>
          ) : <p className="text-sm text-text-muted">No documents uploaded — verify the license number manually before approving.</p>}
        </div>
        <div className="flex items-end gap-2 pt-4 border-t border-border">
          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">Category</label>
            <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Uncategorised</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <button onClick={saveCategory} className="btn-primary">Save category</button>
        </div>
      </div>
    </div>
  );
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [ratesModal, setRatesModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const limit = 20;

  useEffect(() => { api.get('/categories').then(r => setCategories(r.data.data)).catch(() => {}); }, []);

  const fetchProfessionals = useCallback(() => {
    setLoading(true);
    api.get('/professionals', { params: { page, limit, status: statusFilter || undefined, category_id: categoryFilter || undefined, search: search.trim() || undefined } })
      .then((r) => { setProfessionals(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [page, statusFilter, categoryFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchProfessionals, 250);
    return () => clearTimeout(t);
  }, [fetchProfessionals]);

  const approve = async (id) => {
    try { await api.post(`/professionals/${id}/approve`); toast.success('Approved'); fetchProfessionals(); }
    catch { toast.error('Failed'); }
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason (optional):');
    try { await api.post(`/professionals/${id}/reject`, { reason }); toast.success('Rejected'); fetchProfessionals(); }
    catch { toast.error('Failed'); }
  };

  const toggleOnline = async (id) => {
    try { await api.post(`/professionals/${id}/toggle-online`); fetchProfessionals(); }
    catch { toast.error('Failed'); }
  };

  const ban = async (a) => {
    const reason = prompt(`Reason for banning ${a.display_name}? (optional)`);
    if (reason === null) return; // cancelled
    try {
      await api.post(`/professionals/${a.id}/ban`, { reason });
      toast.success(`${a.display_name} has been banned`);
      fetchProfessionals();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const unban = async (a) => {
    if (!window.confirm(`Unban ${a.display_name}? They will become visible to users again.`)) return;
    try {
      await api.post(`/professionals/${a.id}/unban`);
      toast.success(`${a.display_name} has been unbanned`);
      fetchProfessionals();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const totalPages = Math.ceil(total / limit);

  const statusBadge = (s) => {
    if (s === 'approved') return 'badge-success';
    if (s === 'rejected') return 'badge-error';
    return 'badge-warning';
  };

  return (
    <div className="p-8">
      {ratesModal && <RatesModal professional={ratesModal} onClose={() => setRatesModal(null)} onSaved={fetchProfessionals} />}
      {detail && <DetailModal professional={detail} categories={categories} onClose={() => setDetail(null)} onSaved={() => { setDetail(null); fetchProfessionals(); }} />}

      <PageHeader title="Professionals" subtitle={`${total} total`} />

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input className="input pl-9" placeholder="Search name, email or profession" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-auto" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        {['', 'pending', 'approved', 'rejected', 'banned'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === s
                ? s === 'banned' ? 'bg-red-600 text-white' : 'bg-brand text-white'
                : 'bg-surface-light text-text-secondary hover:text-white'
            }`}
          >
            {s === '' ? 'All' : s === 'banned' ? '🚫 Banned' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-xs uppercase">
              <th className="px-4 py-3 text-left">Professional</th>
              <th className="px-4 py-3 text-left">Profession</th>
              <th className="px-4 py-3 text-right">Earnings</th>
              <th className="px-4 py-3 text-right">Consultations</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Online</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableShimmer rows={8} cols={8} />
            ) : professionals.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-text-muted">No professionals found</td></tr>
            ) : professionals.map((a) => (
              <tr key={a.id} className={`border-b border-divider hover:bg-surface-light/50 ${a.is_banned ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {a.is_banned && <span className="text-red-400 text-xs font-bold">🚫</span>}
                    <div>
                      <p className="font-medium text-white">{a.display_name}</p>
                      <p className="text-text-muted text-xs">{a.email}</p>
                      {a.is_banned && a.ban_reason && (
                        <p className="text-red-400 text-xs mt-0.5">Reason: {a.ban_reason}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  <p className="text-text-secondary">{a.profession_title || '—'}</p>
                  <p className="text-text-muted">{a.category_icon} {a.category_name || 'Uncategorised'}</p>
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">{fmt(a.total_earnings)}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{a.total_consultations}</td>
                <td className="px-4 py-3">
                  {a.is_banned
                    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">Banned</span>
                    : <span className={statusBadge(a.status)}>{a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : '—'}</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <button disabled={a.is_banned} onClick={() => toggleOnline(a.id)} className={`w-10 h-5 rounded-full transition-colors ${a.is_online ? 'bg-success' : 'bg-border'} relative disabled:opacity-40`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${a.is_online ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-text-muted text-xs">{format(new Date(a.created_at), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Tooltip content="View profile, credentials & category" side="left">
                      <button onClick={() => setDetail(a)} className="p-1.5 rounded-lg bg-surface-light hover:bg-border transition-colors">
                        <Eye size={14} className="text-text-secondary" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Set per-minute rates" side="left">
                      <button onClick={() => setRatesModal(a)} className="p-1.5 rounded-lg bg-surface-light hover:bg-border transition-colors">
                        <Edit2 size={14} className="text-text-secondary" />
                      </button>
                    </Tooltip>
                    {!a.is_banned && a.status === 'pending' && (
                      <>
                        <Tooltip content="Approve professional" side="left">
                          <button onClick={() => approve(a.id)} className="p-1.5 rounded-lg bg-success/15 hover:bg-success/25 transition-colors">
                            <Check size={14} className="text-success" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Reject application" side="left">
                          <button onClick={() => reject(a.id)} className="p-1.5 rounded-lg bg-error/15 hover:bg-error/25 transition-colors">
                            <X size={14} className="text-error" />
                          </button>
                        </Tooltip>
                      </>
                    )}
                    {!a.is_banned && a.status === 'rejected' && (
                      <Tooltip content="Re-approve professional" side="left">
                        <button onClick={() => approve(a.id)} className="p-1.5 rounded-lg bg-success/15 hover:bg-success/25 transition-colors">
                          <Check size={14} className="text-success" />
                        </button>
                      </Tooltip>
                    )}
                    {/* Ban / Unban */}
                    {a.is_banned ? (
                      <Tooltip content="Remove ban — professional will be visible to users again" side="left">
                        <button onClick={() => unban(a)} className="p-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 transition-colors">
                          <ShieldCheck size={14} className="text-green-400" />
                        </button>
                      </Tooltip>
                    ) : (
                      <Tooltip content="Ban professional — immediately hidden from all users" side="left">
                        <button onClick={() => ban(a)} className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 transition-colors">
                          <Ban size={14} className="text-red-400" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost px-2 py-1.5 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
