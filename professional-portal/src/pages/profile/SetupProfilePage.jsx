import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Sparkles, Upload, FileText } from 'lucide-react'
import { professionalAPI, categoryAPI, aiAPI, uploadAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu', 'Odia']

const EMPTY = {
  display_name: '', profession_title: '', category_id: '', bio: '', experience_years: '',
  organization: '', city: '', license_number: '',
  per_minute_rate_chat: 10, per_minute_rate_call: 15, per_minute_rate_video: 20,
  qualifications: [], specializations: [], languages: [], expertise_areas: [],
}

function TagInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v || values.includes(v)) return setDraft('')
    onChange([...values, v])
    setDraft('')
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="input-field flex-1" placeholder={placeholder} value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button type="button" onClick={add}
          className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center shrink-0 hover:bg-brand-light transition-colors">
          <Plus size={20} className="text-white" />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map(v => (
            <span key={v} className="badge badge-brand">
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SetupProfilePage() {
  const { professional, setProfessional } = useAuth()
  const isEdit = Boolean(professional?.id)
  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    categoryAPI.list().then(r => setCategories(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!professional) return
    setForm(f => {
      const next = { ...f }
      for (const k of Object.keys(EMPTY)) {
        if (professional[k] !== undefined && professional[k] !== null) next[k] = professional[k]
      }
      return next
    })
    setDocuments(Array.isArray(professional.documents) ? professional.documents : [])
  }, [professional])

  const selectedCategory = categories.find(c => String(c.id) === String(form.category_id))

  function set(key, val) {
    setForm(p => ({ ...p, [key]: val }))
  }

  function toggleItem(key, val) {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val],
    }))
  }

  async function generateBio() {
    if (!form.profession_title) return toast.error('Add your profession title first')
    setAiLoading(true)
    try {
      const res = await aiAPI.profileBio({
        display_name: form.display_name,
        profession_title: form.profession_title,
        experience_years: form.experience_years,
        qualifications: form.qualifications,
        specializations: form.specializations,
        organization: form.organization,
        notes: form.bio,
      })
      const { bio, suggested_specializations = [] } = res.data.data
      set('bio', bio)
      if (suggested_specializations.length && !form.expertise_areas.length) set('expertise_areas', suggested_specializations)
      toast.success('Bio drafted — review and edit it before saving')
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI is unavailable right now')
    } finally {
      setAiLoading(false)
    }
  }

  async function uploadDocs(files) {
    if (!files?.length) return
    if (!isEdit) return toast.error('Save your profile first, then upload documents')
    setUploading(true)
    try {
      const res = await uploadAPI.documents(files)
      setDocuments(d => [...d, ...res.data.urls])
      toast.success('Documents uploaded')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.display_name || !form.profession_title || !form.category_id || !form.bio || form.experience_years === '') {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        category_id: parseInt(form.category_id),
        experience_years: parseInt(form.experience_years),
      }
      const res = isEdit ? await professionalAPI.updateMe(payload) : await professionalAPI.register(payload)
      const me = await professionalAPI.getMe().catch(() => res)
      setProfessional(me.data.data)
      toast.success(isEdit ? 'Profile updated' : 'Profile submitted for verification!')
      navigate(isEdit ? '/profile' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Professional Profile' : 'Setup Professional Profile'}</h1>
        <p className="text-text-secondary text-sm mt-1">
          {isEdit ? 'Keep your profile accurate — clients choose you based on it.' : 'Complete your profile. Our team verifies your credentials before you can go online.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profession */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-text-primary">Your Profession</h3>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Category *</label>
            <select className="input-field" value={form.category_id} onChange={e => { set('category_id', e.target.value); set('specializations', []) }} required>
              <option value="">Select your field</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Profession Title *</label>
              <input className="input-field" placeholder="e.g. Cardiologist, Tax Consultant" value={form.profession_title}
                onChange={e => set('profession_title', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Years of Experience *</label>
              <input type="number" min="0" max="60" className="input-field" placeholder="e.g. 5"
                value={form.experience_years} onChange={e => set('experience_years', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">License / Registration No.</label>
              <input className="input-field" placeholder="e.g. MCI / Bar Council / ICAI no." value={form.license_number}
                onChange={e => set('license_number', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Organisation</label>
              <input className="input-field" placeholder="Hospital, firm or institute" value={form.organization}
                onChange={e => set('organization', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Qualifications</label>
            <TagInput values={form.qualifications} onChange={v => set('qualifications', v)} placeholder="e.g. MBBS, LLB, CA, M.Sc" />
          </div>
        </div>

        {/* Basic Info */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-text-primary">Public Profile</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Display Name *</label>
              <input className="input-field" placeholder="Name shown to clients" value={form.display_name}
                onChange={e => set('display_name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">City</label>
              <input className="input-field" placeholder="e.g. Pune" value={form.city}
                onChange={e => set('city', e.target.value)} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-text-secondary">Bio *</label>
              <button type="button" onClick={generateBio} disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-light disabled:opacity-50">
                <Sparkles size={13} /> {aiLoading ? 'Writing…' : 'Write with AI'}
              </button>
            </div>
            <textarea className="input-field min-h-[120px] resize-none" placeholder="Tell clients about your expertise and how you help. Jot a few notes and use “Write with AI” to polish them."
              value={form.bio} onChange={e => set('bio', e.target.value)} required />
          </div>
        </div>

        {/* Specializations */}
        <div className="card space-y-3">
          <h3 className="font-semibold">Specialisations</h3>
          {selectedCategory?.sub_specialities?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedCategory.sub_specialities.map(s => (
                <button key={s} type="button" onClick={() => toggleItem('specializations', s)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    form.specializations.includes(s)
                      ? 'bg-brand text-white'
                      : 'bg-surface-light text-text-secondary hover:text-text-primary border border-border'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Choose a category to see its specialisations.</p>
          )}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 mt-2">Other areas you help with</label>
            <TagInput values={form.expertise_areas} onChange={v => set('expertise_areas', v)} placeholder="e.g. Second opinions, Property disputes" />
          </div>
        </div>

        {/* Languages */}
        <div className="card space-y-3">
          <h3 className="font-semibold">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button key={l} type="button" onClick={() => toggleItem('languages', l)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  form.languages.includes(l)
                    ? 'bg-brand text-white'
                    : 'bg-surface-light text-text-secondary hover:text-text-primary border border-border'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="card space-y-3">
          <h3 className="font-semibold">Verification Documents</h3>
          <p className="text-sm text-text-muted">Upload your degree, license or registration certificate (JPG, PNG or PDF, up to 5 at a time). Only our verification team can see these.</p>
          <label className={`flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-4 text-sm cursor-pointer hover:border-brand ${!isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={16} /> {uploading ? 'Uploading…' : isEdit ? 'Choose files' : 'Available after you submit your profile'}
            <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="hidden" disabled={!isEdit || uploading}
              onChange={e => uploadDocs(e.target.files)} />
          </label>
          {documents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {documents.map((d, i) => (
                <a key={d} href={d} target="_blank" rel="noreferrer" className="badge badge-brand"><FileText size={12} /> Document {i + 1}</a>
              ))}
            </div>
          )}
        </div>

        {/* Rates */}
        <div className="card space-y-4">
          <h3 className="font-semibold">Per Minute Rates (₹)</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'per_minute_rate_chat', label: 'Chat' },
              { key: 'per_minute_rate_call', label: 'Voice Call' },
              { key: 'per_minute_rate_video', label: 'Video Call' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm text-text-secondary mb-1.5">{label}</label>
                <input type="number" min="1" className="input-field" value={form[key]}
                  onChange={e => set(key, parseFloat(e.target.value))} />
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted">You receive 80% of every consultation minute; the platform fee covers payments, calls and support.</p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Submit for Verification'}
        </button>
      </form>
    </div>
  )
}
