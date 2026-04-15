const TAG_STYLES = {
  loved: 'bg-pink-900/50 text-pink-300 border-pink-800',
  want_to_listen: 'bg-blue-900/50 text-blue-300 border-blue-800',
  overrated: 'bg-amber-900/50 text-amber-300 border-amber-800',
}

const TAG_LABELS = {
  loved: 'Loved',
  want_to_listen: 'Want to Listen',
  overrated: 'Overrated',
}

export function TagBadge({ tag }) {
  const style = TAG_STYLES[tag] ?? 'bg-gray-800 text-gray-300 border-gray-700'
  const label = TAG_LABELS[tag] ?? tag

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}
