import LegalPage from '../components/ui/LegalPage'

const EFFECTIVE_DATE = 'September 24, 2026'
const CONTACT_EMAIL = 'support@arpitvarta.com'

const SECTIONS = [
  {
    id: 'overview',
    heading: 'Overview',
    body: [
      'ArpitVarta ("we", "us", "our") provides a professional consultation marketplace — through this website and our mobile apps — where you can consult verified doctors, lawyers, chartered accountants, therapists, coaches and other experts by chat, voice and video, use our AI assistant, and take part in live sessions and a community feed.',
      'This Privacy Policy explains what personal information we collect, why we collect it, who we share it with, and the choices you have. By creating an account or using ArpitVarta, you agree to the practices described here. If you do not agree, please do not use the service.',
    ],
  },
  {
    id: 'collect',
    heading: 'Information We Collect',
    body: ['Depending on how you use ArpitVarta, we collect the following:'],
    list: [
      'Account details — your name, email address and password. Passwords are stored only in hashed form; we cannot read them.',
      'Profile details — phone number, gender, city and date of birth, if you choose to provide them, so professionals can advise you appropriately.',
      'Profile photo — if you upload one.',
      'Consultation content — messages and images you send to professionals in chat, and records of your consultations (professional, type, time, duration and charges). Voice and video calls are carried live through our real-time communication provider.',
      'Wallet and payment records — top-ups, per-minute charges, subscriptions and gifts sent. Payments are handled by our payment provider; we do not receive or store your card, UPI or bank credentials.',
      'Community activity — posts, comments, likes, live-session chat messages, gifts and reviews you submit. These may be visible to other users.',
      'AI assistant queries — the problem descriptions you type into the AI assistant, so that we can suggest relevant professionals. Please do not include passwords, OTPs or bank details.',
      'Technical information — browser and device type, IP address, pages visited and basic diagnostic logs, collected automatically to run and secure the service.',
      'Support communications — anything you send us when you contact support, including through the live chat widget.',
    ],
  },
  {
    id: 'use',
    heading: 'How We Use Your Information',
    list: [
      'To create and secure your account and log you in.',
      'To connect you with professionals and deliver chats, calls and personalised recommendations.',
      'To process payments, maintain your wallet balance and bill consultations accurately.',
      'To generate AI assistant suggestions for the questions you ask.',
      'To send service messages such as consultation updates and notifications.',
      'To provide customer support, prevent fraud and abuse, and keep the platform safe.',
      'To understand how the service is used and to improve its features and performance.',
      'To comply with legal obligations.',
    ],
  },
  {
    id: 'sharing',
    heading: 'Who We Share Information With',
    body: ['We do not sell your personal information. We share it only as follows:'],
    list: [
      'Professionals you consult — they see the details needed to advise you (such as your name, profile details and the messages and documents you share during the consultation).',
      'Other users — anything you post publicly in the community, live sessions or reviews (reviews can be submitted anonymously).',
      'Service providers who act on our behalf — payment processing (Razorpay), real-time voice/video (Agora), live-chat support (Tawk.to), hosting and infrastructure, and an AI provider (Google Gemini) that processes AI assistant queries. They may only use your information to provide their service to us.',
      'Legal and safety reasons — where required by law or to protect the rights, safety and security of users, professionals or ArpitVarta.',
      'Business transfers — if ArpitVarta is involved in a merger, acquisition or sale of assets, your information may be transferred, and we will tell you if that changes how it is handled.',
    ],
  },
  {
    id: 'cookies',
    heading: 'Cookies and Local Storage',
    body: [
      'We store a login token, your theme preference and your shopping cart in your browser\'s local storage so the site works as you expect. Our live-chat widget (Tawk.to) and font provider (Google Fonts) may set their own cookies or receive your IP address under their own privacy policies. You can clear local storage and cookies at any time through your browser settings; you will then need to log in again.',
    ],
  },
  {
    id: 'security',
    heading: 'Data Security',
    body: [
      'We protect your information with measures including encrypted connections (HTTPS), hashed passwords, and access controls that limit chat history and account data to you (and the professional in that conversation). No system is completely secure, so we cannot guarantee absolute security. Please keep your password confidential.',
    ],
  },
  {
    id: 'retention',
    heading: 'Data Retention',
    body: [
      'We keep your information for as long as your account is active and as needed to provide the service. Some records — such as payment and transaction history — may be kept longer where required for accounting, tax, dispute-resolution or legal purposes. When information is no longer needed, we delete or anonymise it.',
    ],
  },
  {
    id: 'rights',
    heading: 'Your Choices and Rights',
    body: ['You can:'],
    list: [
      'View and update your profile details from My Account.',
      'Request a copy of the personal information we hold about you.',
      'Ask us to correct inaccurate information.',
      'Ask us to delete your account and associated personal data, subject to records we must keep by law.',
      'Withdraw consent for optional processing, such as notifications, at any time.',
    ],
    after: `To exercise any of these rights, email us at ${CONTACT_EMAIL} from the address on your account. We will respond within a reasonable time and in line with applicable Indian data-protection law.`,
  },
  {
    id: 'children',
    heading: 'Children\'s Privacy',
    body: [
      'ArpitVarta is intended for people aged 18 and over. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us and we will delete it.',
    ],
  },
  {
    id: 'transfers',
    heading: 'Where Your Data Is Processed',
    body: [
      'Some of our service providers operate servers outside India, so your information may be processed in other countries. Where this happens, we rely on providers that apply appropriate safeguards to protect it.',
    ],
  },
  {
    id: 'changes',
    heading: 'Changes to This Policy',
    body: [
      'We may update this policy from time to time. When we do, we will change the effective date above, and for significant changes we will give more prominent notice. Continued use of ArpitVarta after an update means you accept the revised policy.',
    ],
  },
  {
    id: 'contact',
    heading: 'Contact Us',
    body: [
      `Questions, concerns or requests about this policy or your data? Email us at ${CONTACT_EMAIL}.`,
    ],
  },
]

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      metaDescription="How ArpitVarta collects, uses, shares and protects your personal information, and the choices you have."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
      seeAlso={{ to: '/terms', label: 'Terms of Use' }}
    />
  )
}
