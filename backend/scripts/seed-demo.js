#!/usr/bin/env node
// Seeds local demo data: an admin, a demo user with wallet balance and a set
// of approved professionals across categories. Idempotent — safe to re-run.
// Usage: npm run seed      (never run against production)

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== 'true') {
  console.error('Refusing to seed demo data with NODE_ENV=production');
  process.exit(1);
}

const DEMO_PASSWORD = 'Demo@1234';

const PROS = [
  ['doctor', 'Dr. Ananya Mehta', 'General Physician', 12, ['MBBS', 'MD (Internal Medicine)'], ['General Physician', 'Diabetes', 'Fever & Infections'], 'Mumbai', 15, true],
  ['doctor', 'Dr. Rohan Kapoor', 'Dermatologist', 9, ['MBBS', 'MD (Dermatology)'], ['Dermatologist', 'Acne', 'Hair Loss'], 'Delhi', 20, true],
  ['doctor', 'Dr. Kavita Rao', 'Pediatrician', 15, ['MBBS', 'DCH'], ['Pediatrician', 'Newborn Care', 'Vaccination'], 'Bengaluru', 18, false],
  ['legal', 'Adv. Vikram Singh', 'Property & Civil Lawyer', 14, ['LLB', 'LLM'], ['Property Law', 'Civil Disputes', 'Rent Agreements'], 'Delhi', 25, true],
  ['legal', 'Adv. Priya Nair', 'Family & Divorce Lawyer', 10, ['BA LLB (Hons)'], ['Family & Divorce', 'Child Custody', 'Domestic Violence'], 'Kochi', 22, true],
  ['legal', 'Adv. Sameer Joshi', 'Corporate Lawyer', 8, ['LLB', 'CS'], ['Corporate Law', 'Contracts', 'Startup Compliance'], 'Pune', 30, false],
  ['finance', 'CA Neha Agarwal', 'Chartered Accountant', 11, ['CA', 'B.Com'], ['Income Tax', 'GST', 'NRI Taxation'], 'Jaipur', 18, true],
  ['finance', 'CA Arjun Patel', 'Tax & Audit Consultant', 7, ['CA'], ['GST', 'Audit', 'Company Registration'], 'Ahmedabad', 15, true],
  ['investment', 'Rahul Verma, CFP', 'SEBI Registered Investment Advisor', 13, ['CFP', 'MBA (Finance)'], ['Mutual Funds', 'Retirement Planning', 'Insurance'], 'Mumbai', 25, false],
  ['mental-health', 'Dr. Sneha Iyer', 'Clinical Psychologist', 9, ['M.Phil Clinical Psychology', 'RCI Licensed'], ['Anxiety & Stress', 'Depression', 'Relationship Counselling'], 'Chennai', 20, true],
  ['mental-health', 'Aditi Sharma', 'Counselling Psychologist', 6, ['MA Psychology'], ['Relationship Counselling', 'Anxiety & Stress'], 'Gurugram', 12, true],
  ['career', 'Karan Malhotra', 'Career & Interview Coach', 10, ['MBA (IIM)', 'ICF Certified Coach'], ['Interview Prep', 'Resume Review', 'Career Switch'], 'Bengaluru', 15, true],
  ['education', 'Meera Krishnan', 'Mathematics Tutor (JEE)', 12, ['M.Sc Mathematics', 'B.Ed'], ['Mathematics', 'JEE / NEET'], 'Hyderabad', 10, true],
  ['education', 'Imran Khan', 'UPSC Mentor', 8, ['MA Public Administration'], ['UPSC', 'Essay Writing'], 'Lucknow', 12, false],
  ['fitness', 'Riya Desai', 'Certified Dietitian', 7, ['M.Sc Nutrition', 'RD'], ['Diet & Nutrition', 'Weight Loss', 'PCOS Diet'], 'Surat', 10, true],
  ['fitness', 'Aman Gill', 'Personal Trainer & Yoga Coach', 9, ['ACE Certified', 'RYT 500'], ['Personal Training', 'Yoga'], 'Chandigarh', 8, true],
  ['tech', 'Siddharth Rao', 'Senior Software Architect', 15, ['B.Tech CSE', 'AWS Solutions Architect'], ['Cloud & DevOps', 'Web Development', 'System Design'], 'Bengaluru', 30, true],
  ['business', 'Pooja Bansal', 'Startup & Marketing Consultant', 11, ['MBA (Marketing)'], ['Startup Strategy', 'Digital Marketing', 'Fundraising'], 'Noida', 25, false],
  ['property', 'Ar. Nikhil Menon', 'Architect & Interior Designer', 12, ['B.Arch', 'COA Registered'], ['Architecture', 'Interior Design'], 'Kochi', 20, true],
  ['veterinary', 'Dr. Farah Ali', 'Veterinarian', 8, ['BVSc & AH'], ['Dogs', 'Cats', 'Pet Nutrition'], 'Hyderabad', 10, true],
];

async function upsertUser(client, { email, name, role, password, city }) {
  const hash = await bcrypt.hash(password, 10);
  const r = await client.query(`
    INSERT INTO users (email, password_hash, name, role, city)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    RETURNING id`, [email, hash, name, role, city || null]);
  await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT DO NOTHING', [r.rows[0].id]);
  return r.rows[0].id;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await upsertUser(client, { email: 'admin@arpitvarta.com', name: 'Super Admin', role: 'admin', password: 'Admin@1234' });

    const userId = await upsertUser(client, { email: 'user@arpitvarta.com', name: 'Demo User', role: 'user', password: DEMO_PASSWORD, city: 'Mumbai' });
    await client.query('UPDATE wallets SET balance = GREATEST(balance, 1000), total_added = GREATEST(total_added, 1000) WHERE user_id = $1', [userId]);

    const cats = await client.query('SELECT id, slug FROM categories');
    const catId = Object.fromEntries(cats.rows.map((c) => [c.slug, c.id]));

    for (let i = 0; i < PROS.length; i += 1) {
      const [slug, name, title, exp, quals, specs, city, rate, online] = PROS[i];
      const email = `pro${i + 1}@arpitvarta.com`;
      const uid = await upsertUser(client, { email, name, role: 'professional', password: DEMO_PASSWORD, city });
      const exists = await client.query('SELECT id FROM professionals WHERE user_id = $1', [uid]);
      if (exists.rows.length) continue;
      const rating = (4.2 + ((i * 7) % 8) / 10).toFixed(2);
      await client.query(`
        INSERT INTO professionals (user_id, category_id, display_name, profession_title, bio, experience_years, qualifications,
          license_number, city, languages, specializations, expertise_areas, per_minute_rate_chat, per_minute_rate_call,
          per_minute_rate_video, rating, review_count, total_consultations, is_online, is_verified, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,TRUE,'approved')`,
      [uid, catId[slug], name, title,
        `I am a ${title.toLowerCase()} with ${exp} years of experience helping clients across India. I explain options in plain language and help you decide your next step with confidence.`,
        exp, quals, `REG-${1000 + i}`, city, i % 3 === 0 ? ['English', 'Hindi', 'Marathi'] : ['English', 'Hindi'],
        specs, specs, rate, Math.round(rate * 1.5), rate * 2, rating, 20 + i * 13, 100 + i * 37, online]);
    }

    const post = await client.query('SELECT 1 FROM community_posts LIMIT 1');
    if (!post.rows.length) {
      const authors = await client.query(`SELECT p.id, p.user_id, c.slug FROM professionals p JOIN categories c ON c.id = p.category_id ORDER BY p.created_at LIMIT 3`);
      const tips = [
        'Seasonal flu is rising — stay hydrated, rest well and consult a doctor if fever lasts more than 3 days.',
        'Before signing any rent agreement, make sure it is registered and the security deposit terms are written clearly.',
        'ITR filing tip: link your PAN and Aadhaar and download Form 26AS before you start filing.',
      ];
      for (let i = 0; i < authors.rows.length; i += 1) {
        const a = authors.rows[i];
        await client.query(`INSERT INTO community_posts (user_id, professional_id, content, category, status) VALUES ($1, $2, $3, $4, 'approved')`,
          [a.user_id, a.id, tips[i], a.slug]);
      }
    }

    await client.query('COMMIT');
    console.log('✓ Demo data ready');
    console.log('  Admin:        admin@arpitvarta.com / Admin@1234');
    console.log(`  User:         user@arpitvarta.com / ${DEMO_PASSWORD}  (₹1000 wallet)`);
    console.log(`  Professional: pro1@arpitvarta.com … pro${PROS.length}@arpitvarta.com / ${DEMO_PASSWORD}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
