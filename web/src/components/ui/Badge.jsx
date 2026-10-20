const toneClasses = {
  brand: 'badge-brand',
  gold: 'badge-gold',
  online: 'badge-online',
  offline: 'badge-offline',
}

export default function Badge({ children, tone = 'brand', className = '', ...props }) {
  return (
    <span className={`${toneClasses[tone] || toneClasses.brand} ${className}`} {...props}>
      {children}
    </span>
  )
}
