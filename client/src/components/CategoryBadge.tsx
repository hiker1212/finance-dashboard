interface Props {
  name: string
  color: string
}

export function CategoryBadge({ name, color }: Props) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  )
}
