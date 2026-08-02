import mascotAnimation from '../assets/ai-chef-mascot-alpha-v2.webp'

export function AdvisorMascotMedia({ className = '' }: { className?: string }) {
  return (
    <span className={`advisor-mascot__media ${className}`.trim()} aria-hidden="true">
      <img src={mascotAnimation} alt="" decoding="async" />
    </span>
  )
}

export function AdvisorMascotButton({ onActivate }: { onActivate: () => void }) {
  return (
    <button
      type="button"
      className="home-advisor-link advisor-mascot"
      onClick={onActivate}
      aria-label="打开 AI 味觉顾问"
    >
      <AdvisorMascotMedia />
    </button>
  )
}
