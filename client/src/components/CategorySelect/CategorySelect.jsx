import React from 'react'
import {
  STRUCTURED_CATEGORY_GROUPS,
  formatCategoryLabel,
  groupCategoriesForSelect,
} from '../../constants/categoryConstants'

/**
 * Reusable Structured Category Select Dropdown Component
 * Groups categories with clear optgroup labels for All India vs State Quotas.
 */
export default function CategorySelect({
  value,
  onChange,
  availableCategories,
  showAllOption = false,
  allOptionLabel = 'All Categories (Show All Seats)',
  className = '',
  name = 'category',
  required = false,
  disabled = false,
  id,
}) {
  // If specific dynamic list of categories is provided (e.g. from state database)
  if (availableCategories && availableCategories.length > 0) {
    const { hasAll, groups } = groupCategoriesForSelect(availableCategories)

    return (
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer ${className}`}
      >
        {(showAllOption || hasAll) && (
          <option value="All Categories" className="font-bold text-brand-700">
            {allOptionLabel}
          </option>
        )}

        {groups.map((group) => (
          <optgroup key={group.label} label={group.label} className="font-bold text-slate-600 bg-slate-100 py-1">
            {group.items.map((cat) => (
              <option key={cat} value={cat} className="font-normal text-slate-800 bg-white py-1">
                {formatCategoryLabel(cat)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    )
  }

  // Default structured categories
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer ${className}`}
    >
      {showAllOption && (
        <option value="All Categories" className="font-bold text-brand-700">
          {allOptionLabel}
        </option>
      )}

      {STRUCTURED_CATEGORY_GROUPS.map((group) => (
        <optgroup key={group.groupLabel} label={group.groupLabel} className="font-bold text-slate-600 bg-slate-100 py-1">
          {group.categories.map((cat) => (
            <option key={cat.id} value={cat.id} className="font-normal text-slate-800 bg-white py-1">
              {cat.label} — {cat.desc}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
