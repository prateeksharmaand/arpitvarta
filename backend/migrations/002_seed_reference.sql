-- ============================================================
-- ArpitVarta — reference data (idempotent)
-- ============================================================

INSERT INTO categories (slug, name, icon, description, sub_specialities, sort_order) VALUES
  ('doctor',     'Doctors',              '🩺', 'General physicians and specialists for medical advice, second opinions and prescriptions guidance.',
     ARRAY['General Physician','Pediatrician','Dermatologist','Gynecologist','Cardiologist','Orthopedic','ENT','Dentist'], 1),
  ('legal',      'Lawyers',              '⚖️', 'Advocates for property, family, criminal, corporate and consumer matters.',
     ARRAY['Property Law','Family & Divorce','Criminal Law','Corporate Law','Consumer Court','Cyber Law','Labour Law'], 2),
  ('finance',    'Chartered Accountants', '📊', 'CAs and tax experts for ITR, GST, audits, company registration and compliance.',
     ARRAY['Income Tax','GST','Audit','Company Registration','Accounting','NRI Taxation'], 3),
  ('investment', 'Financial Advisors',   '💰', 'SEBI-registered advisors for investments, insurance, retirement and wealth planning.',
     ARRAY['Mutual Funds','Stock Market','Insurance','Retirement Planning','Loans & Credit'], 4),
  ('mental-health','Psychologists & Therapists','🧠', 'Licensed counsellors for stress, anxiety, relationships and emotional wellbeing.',
     ARRAY['Anxiety & Stress','Depression','Relationship Counselling','Child Psychology','Addiction'], 5),
  ('career',     'Career Coaches',       '🎯', 'Mentors for career change, interview prep, resume reviews and higher studies abroad.',
     ARRAY['Interview Prep','Resume Review','Career Switch','Study Abroad','Leadership Coaching'], 6),
  ('education',  'Tutors & Educators',   '📚', 'Subject experts and exam coaches for school, college and competitive exams.',
     ARRAY['Mathematics','Science','English','JEE / NEET','UPSC','Coding for Kids'], 7),
  ('fitness',    'Fitness & Nutrition',  '🏋️', 'Certified trainers, dietitians and yoga instructors.',
     ARRAY['Personal Training','Diet & Nutrition','Yoga','Weight Loss','Sports Nutrition'], 8),
  ('tech',       'Tech Consultants',     '💻', 'Software engineers, architects and IT consultants for projects and troubleshooting.',
     ARRAY['Web Development','Mobile Apps','Cloud & DevOps','Data & AI','Cyber Security'], 9),
  ('business',   'Business Consultants', '📈', 'Advisors for startups, marketing, operations, fundraising and strategy.',
     ARRAY['Startup Strategy','Digital Marketing','Fundraising','Operations','Sales'], 10),
  ('property',   'Real Estate & Architects','🏠', 'Architects, interior designers and real-estate consultants.',
     ARRAY['Architecture','Interior Design','Property Valuation','Home Loans','Vastu'], 11),
  ('veterinary', 'Veterinarians',        '🐾', 'Vets for pet health, nutrition and behaviour.',
     ARRAY['Dogs','Cats','Birds','Pet Nutrition','Pet Behaviour'], 12),
  ('spiritual',  'Astrology & Spiritual', '✨', 'Astrologers, tarot readers and spiritual guides.',
     ARRAY['Vedic Astrology','Tarot','Numerology','Meditation'], 13),
  ('other',      'Other Experts',        '💼', 'Specialists in any other field.',
     ARRAY[]::TEXT[], 99)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subscription_plans (name, price, duration_days, features, free_minutes, discount_percent) VALUES
  ('Basic',    0,   0,  '["Browse all professionals","Free AI Assistant (5 queries/day)","Community access"]', 0, 0),
  ('Silver',   299, 30, '["Unlimited AI Assistant","5 free chat minutes/month","Priority queue","Ad-free"]', 5, 10),
  ('Gold',     599, 30, '["All Silver features","15 free minutes/month","10% off calls","Consultation summaries"]', 15, 20),
  ('Platinum', 999, 30, '["All Gold features","30 free minutes/month","20% off all consultations","Exclusive live sessions","Dedicated relationship manager"]', 30, 30)
ON CONFLICT (name) DO NOTHING;

INSERT INTO recharge_offers (amount, bonus_percent, label, sort_order)
SELECT * FROM (VALUES
  (50::DECIMAL,   50, '50% Extra', 1),
  (100::DECIMAL,  50, '50% Extra', 2),
  (200::DECIMAL,  25, '25% Extra', 3),
  (500::DECIMAL,  20, '20% Extra', 4),
  (1000::DECIMAL, 15, '15% Extra', 5)
) AS v(amount, bonus_percent, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM recharge_offers);
