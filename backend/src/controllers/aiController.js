const db = require('../config/database');
const gemini = require('../services/gemini');

const FREE_DAILY_LIMIT = parseInt(process.env.AI_FREE_DAILY_LIMIT || '5', 10);
const DISCLAIMER = 'This AI guidance is general information, not professional advice. Please consult a verified professional for your specific situation.';

async function loadCategories() {
  const r = await db.query('SELECT id, slug, name, description, sub_specialities FROM categories WHERE is_active ORDER BY sort_order');
  return r.rows;
}

// Everyday words people use for each category, on top of the category's own
// name / sub-specialities, for the keyword fallback.
const CATEGORY_KEYWORDS = {
  doctor: ['doctor', 'fever', 'pain', 'cough', 'cold', 'headache', 'skin', 'rash', 'acne', 'blood', 'sugar', 'diabetes', 'pressure', 'pregnan', 'period', 'child', 'baby', 'stomach', 'infection', 'medicine', 'tooth', 'allergy', 'sick', 'hospital', 'symptom'],
  legal: ['lawyer', 'legal', 'court', 'case', 'police', 'fir', 'landlord', 'tenant', 'deposit', 'rent', 'property', 'divorce', 'custody', 'notice', 'contract', 'agreement', 'cheque', 'bounce', 'fraud', 'consumer', 'will', 'inheritance', 'dispute', 'bail', 'harass'],
  finance: ['tax', 'itr', 'gst', 'audit', 'accountant', 'ca ', 'tds', 'refund', 'income tax', 'invoice', 'company registration', 'pan', 'bookkeeping', 'balance sheet'],
  investment: ['invest', 'mutual fund', 'sip', 'stock', 'share', 'insurance', 'retire', 'pension', 'loan', 'emi', 'credit score', 'portfolio', 'savings', 'fd'],
  'mental-health': ['stress', 'anxiety', 'depress', 'sad', 'lonely', 'panic', 'sleep', 'relationship', 'breakup', 'therapy', 'counsel', 'overthink', 'anger', 'trauma', 'addiction', 'mental'],
  career: ['job', 'career', 'interview', 'resume', 'cv', 'promotion', 'switch', 'salary', 'offer letter', 'linkedin', 'abroad', 'masters', 'mba'],
  education: ['exam', 'tutor', 'study', 'maths', 'math', 'physics', 'chemistry', 'jee', 'neet', 'upsc', 'homework', 'school', 'college', 'board', 'coding'],
  fitness: ['weight', 'diet', 'fat', 'gym', 'workout', 'fitness', 'yoga', 'nutrition', 'protein', 'muscle', 'pcos', 'meal'],
  tech: ['website', 'app', 'software', 'code', 'bug', 'server', 'cloud', 'aws', 'database', 'hack', 'laptop', 'computer', 'api', 'developer'],
  business: ['business', 'startup', 'marketing', 'sales', 'brand', 'funding', 'investor', 'customers', 'shop', 'franchise', 'strategy'],
  property: ['house', 'home', 'flat', 'interior', 'architect', 'construction', 'renovat', 'plot', 'vastu', 'design my'],
  veterinary: ['dog', 'cat', 'pet', 'puppy', 'kitten', 'vet', 'bird', 'parrot'],
  spiritual: ['astrolog', 'horoscope', 'kundli', 'tarot', 'numerolog', 'meditat', 'spiritual'],
};

// Keyword fallback used when Gemini is unavailable, so the assistant still
// routes users to the right category.
function keywordMatch(query, categories) {
  const q = ` ${query.toLowerCase()} `;
  const scored = categories.map((c) => {
    const words = [c.name, c.slug, ...(c.sub_specialities || []), ...(CATEGORY_KEYWORDS[c.slug] || [])]
      .map((w) => String(w).toLowerCase())
      .filter((w) => w.length > 2);
    const score = words.reduce((n, w) => n + (q.includes(w) ? 1 : 0), 0);
    return { slug: c.slug, score };
  }).filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
  return scored.length ? scored.slice(0, 2).map((c) => c.slug) : ['other'];
}

async function matchProfessionals(categorySlugs, specializations = []) {
  if (!categorySlugs.length) return [];
  const r = await db.query(`
    SELECT a.id, a.display_name, a.profession_title, a.avatar_url, a.experience_years, a.rating, a.review_count,
           a.per_minute_rate_chat, a.per_minute_rate_call, a.per_minute_rate_video, a.is_online, a.is_verified,
           a.languages, a.specializations, a.city,
           c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon,
           (SELECT COUNT(*) FROM unnest(a.specializations) s WHERE s ILIKE ANY($2::text[])) AS spec_hits
    FROM professionals a
    JOIN categories c ON c.id = a.category_id
    WHERE c.slug = ANY($1::text[]) AND a.status = 'approved' AND NOT COALESCE(a.is_banned, FALSE)
    ORDER BY spec_hits DESC, a.is_online DESC, a.rating DESC
    LIMIT 6
  `, [categorySlugs, specializations.map((s) => `%${s}%`)]);
  return r.rows.map(({ spec_hits, ...p }) => p);
}

// POST /api/ai/assist  { query }
// Understands the user's problem, gives safe general pointers, and routes
// them to the right profession + matching professionals.
exports.assist = async (req, res) => {
  try {
    const query = String(req.body.query || '').trim().slice(0, 2000);
    if (query.length < 5) return res.status(400).json({ success: false, message: 'Please describe what you need help with' });

    if (req.user && req.user.subscription_plan === 'free') {
      const used = await db.query(
        `SELECT COUNT(*) FROM ai_queries WHERE user_id = $1 AND created_at >= DATE_TRUNC('day', NOW())`,
        [req.user.id]
      );
      if (parseInt(used.rows[0].count, 10) >= FREE_DAILY_LIMIT) {
        return res.status(429).json({ success: false, code: 'AI_LIMIT', message: `You have used your ${FREE_DAILY_LIMIT} free AI queries for today. Upgrade your plan for unlimited access.` });
      }
    }

    const categories = await loadCategories();
    let result;
    let source = 'ai';

    if (gemini.isConfigured()) {
      try {
        const catalogue = categories.map((c) => `- ${c.slug}: ${c.name} (${(c.sub_specialities || []).join(', ')})`).join('\n');
        result = await gemini.generateJson(`You are the triage assistant for ArpitVarta, an Indian marketplace where users consult verified professionals (doctors, lawyers, chartered accountants, therapists, tutors, coaches, etc.) over paid chat, voice and video calls.

A user wrote: """${query}"""

Available profession categories (slug: name (sub-specialities)):
${catalogue}

Respond ONLY with JSON of this exact shape:
{
  "summary": "one or two sentences restating the user's need in plain language",
  "category_slugs": ["1-2 slugs from the list above, best match first"],
  "specializations": ["1-3 sub-specialities from the chosen categories that fit best"],
  "urgency": "low" | "medium" | "high" | "emergency",
  "general_guidance": ["3-5 short, safe, general pointers the user can act on now"],
  "questions_to_ask": ["3-4 questions the user should ask the professional"],
  "consultation_type": "chat" | "voice" | "video"
}
Rules: never diagnose, prescribe medication or give definitive legal/financial verdicts. If there is any risk to life or safety (e.g. chest pain, suicidal thoughts, violence) set urgency to "emergency" and make the first guidance item tell them to call 112 or visit the nearest hospital immediately. Use only slugs from the list.`);
      } catch (e) {
        console.error('[ai.assist] Gemini failed, using keyword fallback:', e.message);
      }
    }

    if (!result) {
      source = 'fallback';
      const slugs = keywordMatch(query, categories);
      result = {
        summary: 'Here are professionals who can help with your request.',
        category_slugs: slugs,
        specializations: [],
        urgency: 'medium',
        general_guidance: ['Note down the key facts, dates and documents related to your issue before the consultation.'],
        questions_to_ask: ['What are my options?', 'What will the next steps cost?', 'How long will this take?'],
        consultation_type: 'chat',
      };
    }

    const validSlugs = new Set(categories.map((c) => c.slug));
    result.category_slugs = (result.category_slugs || []).filter((s) => validSlugs.has(s));
    if (!result.category_slugs.length) result.category_slugs = ['other'];

    const professionals = await matchProfessionals(result.category_slugs, result.specializations || []);
    const matchedCategories = categories
      .filter((c) => result.category_slugs.includes(c.slug))
      .map(({ id, slug, name }) => ({ id, slug, name }));

    const payload = { ...result, categories: matchedCategories, professionals, disclaimer: DISCLAIMER, source };

    db.query('INSERT INTO ai_queries (user_id, query, response) VALUES ($1, $2, $3)', [req.user?.id || null, query, JSON.stringify(result)])
      .catch((e) => console.error('[ai.assist] log failed:', e.message));

    res.json({ success: true, data: payload });
  } catch (err) {
    console.error('[ai.assist]', err);
    res.status(500).json({ success: false, message: 'AI assistant is unavailable right now' });
  }
};

// POST /api/ai/profile-bio — helps professionals write their public profile.
exports.profileBio = async (req, res) => {
  try {
    const { display_name, profession_title, experience_years, specializations = [], qualifications = [], organization, notes } = req.body;
    if (!gemini.isConfigured()) return res.status(503).json({ success: false, message: 'AI is not configured' });

    const out = await gemini.generateJson(`Write a professional public profile for a consultant listed on ArpitVarta (an Indian professional consultation marketplace).
Name: ${display_name || 'the professional'}
Profession: ${profession_title || 'Professional'}
Experience: ${experience_years || 0} years
Qualifications: ${[].concat(qualifications).join(', ') || 'not specified'}
Specialisations: ${[].concat(specializations).join(', ') || 'not specified'}
Organisation: ${organization || 'not specified'}
Extra notes: ${notes || 'none'}

Respond ONLY with JSON: {"tagline": "max 12 words", "bio": "80-120 words, first person, warm and credible, no exaggerated claims", "suggested_specializations": ["up to 5 short tags"]}`, { temperature: 0.7, maxOutputTokens: 1024 });

    res.json({ success: true, data: out });
  } catch (err) {
    console.error('[ai.profileBio]', err.message);
    res.status(500).json({ success: false, message: 'Could not generate a bio right now' });
  }
};
