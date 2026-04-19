export const glassStyle = {
  background: 'var(--bg-card)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid var(--border-primary)',
  borderRadius: 14,
}

export default function GlassCard({ children, style, className, onClick, ...rest }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{ ...glassStyle, padding: 16, ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}
