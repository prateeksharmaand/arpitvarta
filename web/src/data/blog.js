// Static articles for the Blog section. General, educational writing — not
// professional advice. Images use https://picsum.photos placeholders.

export const blogCategories = ['Health', 'Legal', 'Tax & Finance', 'Career', 'Wellbeing', 'Guides']

export const blogArticles = [
  {
    slug: 'when-to-choose-an-online-doctor-consultation',
    title: 'When an Online Doctor Consultation Makes Sense (and When It Doesn’t)',
    category: 'Health',
    image: 'https://picsum.photos/seed/blog-online-doctor/900/540',
    publishedDate: '2026-09-28',
    excerpt: 'Teleconsultations are great for common illnesses, follow-ups and second opinions — here is how to know when to go in person instead.',
    body: [
      'Online consultations have become a normal part of healthcare in India, and for good reason: they save travel time, reduce waiting-room exposure and make it easy to reach a specialist who may be in another city.',
      'They work best for common conditions such as colds, mild fevers, skin rashes, allergies and stomach upsets, for discussing lab reports, for follow-ups on an ongoing treatment, and for getting a second opinion before a procedure.',
      'Before the call, keep your recent prescriptions, test reports and a list of current medicines handy. Note down when your symptoms started and what makes them better or worse — a clear history is the single most useful thing you can give a doctor.',
      'Some situations always need in-person or emergency care: chest pain, difficulty breathing, sudden weakness on one side of the body, severe bleeding, high fever in a newborn, or any injury from an accident. In those cases call 112 or go to the nearest hospital immediately.',
    ],
  },
  {
    slug: 'getting-your-rental-security-deposit-back',
    title: 'Landlord Not Returning Your Security Deposit? Your Options Explained',
    category: 'Legal',
    image: 'https://picsum.photos/seed/blog-security-deposit/900/540',
    publishedDate: '2026-09-15',
    excerpt: 'A step-by-step look at how tenants usually recover a withheld deposit — from a polite reminder to a legal notice.',
    body: [
      'Disputes over security deposits are among the most common tenancy problems. In most cases they are resolved without going to court, provided the tenant keeps good records.',
      'Start with your rent agreement: check the clauses on deposit refund, notice period, permitted deductions and the condition the property must be returned in. Gather move-in and move-out photos, rent receipts and any messages with the landlord.',
      'A written request — email or message — stating the amount due and a reasonable deadline is often enough. If that fails, a legal notice drafted by a lawyer usually prompts a response, because it signals that you are prepared to escalate.',
      'Where the matter still is not resolved, options can include the Rent Authority under the applicable state tenancy law, a consumer forum or a civil suit, depending on your state and the amount involved. A short consultation with a property lawyer can tell you which route fits your case.',
    ],
  },
  {
    slug: 'old-vs-new-tax-regime-how-to-decide',
    title: 'Old vs New Tax Regime: A Simple Way to Decide',
    category: 'Tax & Finance',
    image: 'https://picsum.photos/seed/blog-tax-regime/900/540',
    publishedDate: '2026-08-30',
    excerpt: 'The new regime has lower rates but fewer deductions. Here is how to compare the two for your own salary.',
    body: [
      'Salaried taxpayers can choose between the old tax regime, which allows deductions such as 80C, 80D and HRA, and the new regime, which offers lower slab rates but removes most of those deductions.',
      'The quickest way to compare is to add up the deductions you genuinely claim — PF, ELSS, life insurance, health insurance, home-loan interest, HRA — and calculate your tax both ways. If your deductions are modest, the new regime often comes out cheaper.',
      'Remember that the choice can affect how much tax your employer deducts each month (TDS), so tell your employer which regime you prefer at the start of the year.',
      'If you have freelance income, capital gains, rental income or income from abroad, the calculation gets more involved. A chartered accountant can model both regimes for you in a single session and help you file correctly.',
    ],
  },
  {
    slug: 'preparing-for-a-career-switch',
    title: 'Planning a Career Switch Without Starting From Zero',
    category: 'Career',
    image: 'https://picsum.photos/seed/blog-career-switch/900/540',
    publishedDate: '2026-08-12',
    excerpt: 'How to map your existing skills to a new role, close the gaps and tell a convincing story in interviews.',
    body: [
      'Career switches feel daunting because people assume they must start over. In practice, most successful switchers carry a large share of their skills into the new role.',
      'Begin by listing the tasks you do well today and match them against job descriptions in the field you want to enter. The overlap is your bridge; the gaps are what you need to learn.',
      'Close the gaps with small, visible proof — a course certificate, a side project, a volunteer assignment or an internal transfer. Hiring managers trust evidence more than intent.',
      'Finally, prepare a short, honest story: why you are moving, what you bring, and what you have already done to prepare. A career coach can help you sharpen your resume and rehearse interviews for the new role.',
    ],
  },
  {
    slug: 'recognising-burnout-early',
    title: 'Recognising Burnout Early — and What Actually Helps',
    category: 'Wellbeing',
    image: 'https://picsum.photos/seed/blog-burnout/900/540',
    publishedDate: '2026-07-25',
    excerpt: 'Constant tiredness, irritability and dread on Sunday evenings can be early signs. Here is what to do about them.',
    body: [
      'Burnout is a state of physical and emotional exhaustion caused by long periods of stress. It often creeps in slowly, which makes it easy to dismiss.',
      'Common early signs include feeling tired even after rest, losing interest in work you once enjoyed, irritability, poor sleep, and frequent headaches or stomach problems.',
      'Small changes help: protecting time for sleep and movement, setting boundaries on after-hours messages, and talking to someone you trust. Naming the problem is often the first relief.',
      'If the feelings persist for weeks or start affecting daily life, speak to a psychologist or counsellor. Talking therapy is effective, confidential and can be done from home.',
    ],
  },
  {
    slug: 'how-to-get-the-most-from-an-expert-consultation',
    title: 'How to Get the Most Out of a Paid Expert Consultation',
    category: 'Guides',
    image: 'https://picsum.photos/seed/blog-expert-consultation/900/540',
    publishedDate: '2026-07-10',
    excerpt: 'A little preparation turns a 15-minute call into clear answers. Use this checklist before any consultation.',
    body: [
      'Per-minute consultations reward preparation. Five minutes of planning can save you money and give you sharper advice.',
      'Write a two-line summary of your situation and the single most important question you want answered. Keep relevant documents, reports or screenshots ready to share.',
      'During the session, ask the professional to explain your options and the trade-offs of each, the likely cost and timeline of next steps, and anything you should avoid doing in the meantime.',
      'Not sure which type of expert to approach? Describe your problem to the ArpitVarta AI assistant — it suggests the right category and professionals, plus questions worth asking.',
    ],
  },
]

export function getBlogArticleBySlug(slug) {
  return blogArticles.find((a) => a.slug === slug)
}

export function getRelatedArticles(article, pool = blogArticles, count = 3) {
  if (!article) return []
  const sameCategory = pool.filter(
    (a) => a.slug !== article.slug && a.category === article.category
  )
  const others = pool.filter(
    (a) => a.slug !== article.slug && a.category !== article.category
  )
  return [...sameCategory, ...others].slice(0, count)
}
