const TAG_STYLES = {
  loved: 'bg-pink-900/50 text-pink-300 border-pink-800',
  want_to_listen: 'bg-blue-900/50 text-blue-300 border-blue-800',
  overrated: 'bg-amber-900/50 text-amber-300 border-amber-800',
  put_on: 'bg-teal-900/50 text-teal-300 border-teal-800',
}

const TAG_LABELS = {
  loved: 'Loved',
  want_to_listen: 'Want to Listen',
  overrated: 'Overrated',
  put_on: 'Put On',
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

// Renders one badge per tag in the array
export function TagBadges({ tags, tag }) {
  const list = tags?.length ? tags : (tag ? [tag] : [])
  return (
    <div className="flex flex-wrap gap-1">
      {list.map(t => <TagBadge key={t} tag={t} />)}
    </div>
  )
}

const ALL_TAGS = [
  { value: 'loved', label: 'Loved' },
  { value: 'want_to_listen', label: 'Want to Listen' },
  { value: 'overrated', label: 'Overrated' },
  { value: 'put_on', label: 'Put On' },
]

// Multi-select tag picker — toggling pill buttons
export function TagCheckboxes({ selected, onChange }) {
  function toggle(value) {
    if (selected.includes(value)) {
      const next = selected.filter(t => t !== value)
      if (next.length > 0) onChange(next) // must keep at least one
    } else {
      onChange([...selected, value])
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_TAGS.map(opt => {
        const active = selected.includes(opt.value)
        const style = active ? TAG_STYLES[opt.value] : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${style}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
