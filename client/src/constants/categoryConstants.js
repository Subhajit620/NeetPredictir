/**
 * Comprehensive Structured Category Definitions for NEET Counselling
 * Supports All India Quota (MCC), Central Institutes, and State Counselling Boards.
 */

export const STRUCTURED_CATEGORY_GROUPS = [
  {
    groupLabel: 'All India & Central Quota Categories (MCC)',
    categories: [
      { id: 'General', code: 'UR / General', label: 'General / Open (UR)', desc: 'Unreserved Merit Quota' },
      { id: 'OBC', code: 'OBC-NCL', label: 'OBC / OBC-NCL', desc: 'Other Backward Classes (Non-Creamy Layer)' },
      { id: 'EWS', code: 'EWS', label: 'EWS', desc: 'Economically Weaker Section (10% Central Quota)' },
      { id: 'SC', code: 'SC', label: 'SC', desc: 'Scheduled Caste (15% Central Quota)' },
      { id: 'ST', code: 'ST', label: 'ST', desc: 'Scheduled Tribe (7.5% Central Quota)' },
      { id: 'PwD', code: 'PwD / PH', label: 'PwD / PH', desc: 'Persons with Benchmark Disabilities (5% Horizontal)' },
    ],
  },
  {
    groupLabel: 'State Quota & Regional Categories',
    categories: [
      { id: 'APST', code: 'APST', label: 'APST', desc: 'Arunachal Pradesh Scheduled Tribe (State 85%)' },
      { id: 'NON-APST', code: 'NON-APST', label: 'NON-APST', desc: 'Arunachal Pradesh Open Merit (State 85%)' },
      { id: 'SEBC', code: 'SEBC', label: 'SEBC', desc: 'Socially & Educationally Backward Classes' },
      { id: 'BC', code: 'BC / BC-A / BC-B', label: 'BC / BC-A / BC-B', desc: 'State Backward Class' },
      { id: 'BCM', code: 'BCM', label: 'BCM', desc: 'Backward Class Muslim (Tamil Nadu)' },
      { id: 'MBC', code: 'MBC / DNC', label: 'MBC / DNC', desc: 'Most Backward Class / Denotified Community' },
      { id: 'Ezhava', code: 'EZ', label: 'Ezhava (EZ)', desc: 'Kerala State Quota Category' },
      { id: 'Muslim', code: 'MU', label: 'Muslim (MU)', desc: 'Kerala State Quota Category' },
    ],
  },
  {
    groupLabel: 'Institutional & Management Quotas',
    categories: [
      { id: 'Management', code: 'MGT', label: 'Management Quota', desc: 'Private College Management Seats' },
      { id: 'NRI', code: 'NRI', label: 'NRI Quota', desc: 'Non-Resident Indian Quota Seats' },
    ],
  },
]

export const ALL_CATEGORY_IDS = STRUCTURED_CATEGORY_GROUPS.flatMap((g) => g.categories.map((c) => c.id))

/**
 * Returns formatted descriptive label for any category code
 */
export function formatCategoryLabel(catId) {
  if (!catId) return ''
  if (catId === 'All Categories') return 'All Categories (Show All Seats)'
  if (catId === 'ALL') return 'All Categories'

  const normalized = catId.trim().toUpperCase()

  for (const group of STRUCTURED_CATEGORY_GROUPS) {
    for (const cat of group.categories) {
      if (cat.id.toUpperCase() === normalized || cat.code.toUpperCase() === normalized) {
        return `${cat.label} — ${cat.desc}`
      }
    }
  }

  // Fallback for custom state categories (e.g. OBC-A, OBC-B, SC-PWD, etc.)
  return catId
}

/**
 * Groups an array of dynamic category strings into structured buckets
 */
export function groupCategoriesForSelect(categoryList = []) {
  const centralCats = []
  const stateCats = []
  const otherCats = []
  const hasAll = categoryList.some((c) => c === 'All Categories' || c === 'ALL')

  const centralIds = new Set(['GENERAL', 'UR', 'OBC', 'OBC-NCL', 'EWS', 'SC', 'ST', 'PWD', 'PH'])
  const knownStateIds = new Set(['APST', 'NON-APST', 'SEBC', 'BC', 'BC-A', 'BC-B', 'BCM', 'MBC', 'MBC/DNC', 'EZHAVA', 'MUSLIM', 'OC'])

  for (const item of categoryList) {
    if (item === 'All Categories' || item === 'ALL') continue
    const upper = item.trim().toUpperCase()
    if (centralIds.has(upper)) {
      centralCats.push(item)
    } else if (knownStateIds.has(upper) || upper.includes('STATE') || upper.includes('APST') || upper.includes('BC') || upper.includes('OBC-')) {
      stateCats.push(item)
    } else {
      otherCats.push(item)
    }
  }

  const groups = []

  if (centralCats.length > 0) {
    groups.push({
      label: 'All India & Central Categories (MCC / AIQ)',
      items: centralCats,
    })
  }

  if (stateCats.length > 0) {
    groups.push({
      label: 'State Quota & Regional Reservation Categories',
      items: stateCats,
    })
  }

  if (otherCats.length > 0) {
    groups.push({
      label: 'Additional & Special Reservation Categories',
      items: otherCats,
    })
  }

  return { hasAll, groups }
}
