const variantClasses = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
}

export default function Button({
  children,
  variant = 'primary',
  as: Component = 'button',
  className = '',
  ...props
}) {
  return (
    <Component className={`${variantClasses[variant] || variantClasses.primary} ${className}`} {...props}>
      {children}
    </Component>
  )
}
