import { useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className={`search-bar ${focused ? 'focused' : ''}`}>
      <Search size={16} className="search-icon" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
