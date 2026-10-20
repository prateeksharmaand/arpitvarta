import { useEffect, useRef, useState } from 'react'

// Fades/slides children in the first time they scroll into view. Without
// IntersectionObserver support the content is simply shown. Grids inside can
// add the `stagger-children` class to cascade their items.
export default function Reveal({ as: Tag = 'div', className = '', children, ...props }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(
    () => typeof window === 'undefined' || !('IntersectionObserver' in window)
  )

  useEffect(() => {
    if (shown) return undefined
    const el = ref.current
    if (!el) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'reveal-in' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
