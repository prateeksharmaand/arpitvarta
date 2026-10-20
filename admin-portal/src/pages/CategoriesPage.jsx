import React, { useEffect, useState } from 'react';
import { Edit2, ToggleLeft, ToggleRight, Trash2, Plus } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { TableShimmer } from '../components/Shimmer';
import toast from 'react-hot-toast';

const EMPTY = { name: '', slug: '', icon: '💼', description: '', sub_specialities: [], sort_order: 0, is_active: true };

function CategoryModal({ category, onClose, onSaved }) {
  const isNew = !category.id;
  const [form, setForm] = useState({
    name: category.name || '',
    slug: category.slug || '',
    icon: category.icon || '💼',
    description: category.description || '',
    sub_specialities: (category.sub_specialities || []).join('\n'),
    sort_order: category.sort_order || 0,
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        icon: form.icon,
        description: form.description,
        sub_specialities: form.sub_specialities.split('\n').map(s => s.trim()).filter(Boolean),
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (isNew) {
        await api.post('/categories', payload);
        toast.success('Category created');
      } else {
        await api.put(`/categories/${category.id}`, payload);
        toast.success('Category updated');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        <h3 className="font-semibold text-white mb-4">{isNew ? 'Add Profession Category' : 'Edit Category'}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-1">
              <label className="text-xs text-text-secondary mb-1 block">Icon</label>
              <input className="input text-center text-xl" value={form.icon} onChange={e => set('icon', e.target.value)} maxLength={4} />
            </div>
            <div className="col-span-4">
              <label className="text-xs text-text-secondary mb-1 block">Name *</label>
              <input className="input" placeholder="e.g. Lawyers" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Slug <span className="text-text-muted">(URL key)</span></label>
              <input className="input" placeholder="auto from name" value={form.slug} onChange={e => set('slug', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Sort Order</label>
              <input className="input" type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Description</label>
            <textarea className="input h-20 resize-none" placeholder="Shown to users when browsing this category" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Sub-specialities <span className="text-text-muted">(one per line — used for filters and AI matching)</span></label>
            <textarea className="input h-32 resize-none font-mono text-xs" placeholder={"Property Law\nFamily & Divorce\nCriminal Law"} value={form.sub_specialities} onChange={e => set('sub_specialities', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : isNew ? 'Create Category' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchCategories = () => {
    setLoading(true);
    api.get('/categories').then((r) => setCategories(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const toggle = async (c) => {
    try {
      const r = await api.put(`/categories/${c.id}`, { is_active: !c.is_active });
      setCategories(prev => prev.map(x => x.id === c.id ? { ...x, is_active: r.data.data.is_active } : x));
    } catch {
      toast.error('Failed');
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="p-8">
      {modal && <CategoryModal category={modal} onClose={() => setModal(null)} onSaved={fetchCategories} />}

      <PageHeader
        title="Profession Categories"
        subtitle={`${categories.length} categories — what users can browse and consult`}
        action={
          <button onClick={() => setModal(EMPTY)} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Add Category
          </button>
        }
      />

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-xs uppercase">
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Sub-specialities</th>
              <th className="px-4 py-3 text-right">Professionals</th>
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3 text-center">Sort</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableShimmer rows={6} cols={7} />
            ) : categories.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-text-muted">No categories yet</td></tr>
            ) : categories.map((c) => (
              <tr key={c.id} className="border-b border-divider hover:bg-surface-light/50">
                <td className="px-4 py-3">
                  <span className="mr-2 text-lg">{c.icon}</span>
                  <span className="font-medium text-white">{c.name}</span>
                  <p className="text-text-muted text-xs ml-7">/{c.slug}</p>
                </td>
                <td className="px-4 py-3 text-text-secondary text-xs max-w-xs">{(c.sub_specialities || []).slice(0, 4).join(', ') || '—'}{(c.sub_specialities || []).length > 4 ? '…' : ''}</td>
                <td className="px-4 py-3 text-right text-text-secondary">{parseInt(c.professional_count || 0)}</td>
                <td className="px-4 py-3 text-right text-yellow-400">{parseInt(c.pending_count || 0) || '—'}</td>
                <td className="px-4 py-3 text-center text-text-muted text-xs">{c.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={c.is_active ? 'badge-success' : 'badge-error'}>{c.is_active ? 'Active' : 'Hidden'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setModal(c)} className="p-1.5 rounded-lg bg-surface-light hover:bg-border transition-colors" title="Edit">
                      <Edit2 size={14} className="text-text-secondary" />
                    </button>
                    <button onClick={() => toggle(c)} className="p-1.5 rounded-lg bg-surface-light hover:bg-border transition-colors" title="Show / hide">
                      {c.is_active ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-text-muted" />}
                    </button>
                    <button onClick={() => remove(c)} className="p-1.5 rounded-lg bg-error/10 hover:bg-error/20 transition-colors" title="Delete">
                      <Trash2 size={14} className="text-error" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
