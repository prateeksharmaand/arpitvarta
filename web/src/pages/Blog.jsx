import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionHeading from '../components/ui/SectionHeading'
import { blogArticles as fallbackArticles, blogCategories } from '../data/blog'
import { setPageMeta } from '../lib/demo'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Blog() {
  const [category, setCategory] = useState('')
  const articles = fallbackArticles
  const loading = false

  useEffect(() => {
    setPageMeta({
      title: 'Expert Insights Blog | ArpitVarta',
      description: 'Practical articles on health, legal rights, tax, careers and wellbeing from the ArpitVarta expert network.',
    })
  }, [])

  const allArticles = articles || fallbackArticles

  const filtered = useMemo(() => {
    if (!category) return allArticles
    return allArticles.filter((a) => a.category === category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, allArticles])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Learn"
        title="Expert Insights"
        subtitle="Practical guides on health, legal rights, tax, careers and wellbeing."
      />

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            category === '' ? 'bg-brand text-white' : 'bg-surface-light text-text-secondary hover:text-text-primary'
          }`}
        >
          All
        </button>
        {blogCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              category === c ? 'bg-brand text-white' : 'bg-surface-light text-text-secondary hover:text-text-primary'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-72 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary">No articles in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((article) => (
            <Link key={article.slug} to={`/blog/${article.slug}`}>
              <Card className="flex flex-col gap-3 overflow-hidden h-full hover:border-brand/50 transition-colors">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-44 object-cover rounded-xl -mt-5 -mx-5 mb-1"
                  style={{ width: 'calc(100% + 2.5rem)' }}
                  loading="lazy"
                />
                <Badge tone="brand" className="w-fit">{article.category}</Badge>
                <h2 className="font-semibold text-lg leading-snug line-clamp-2">{article.title}</h2>
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-auto pt-2 border-t border-divider">
                  <CalendarDays size={13} /> {formatDate(article.publishedDate)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
