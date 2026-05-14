'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import type { Case } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  active: '在案',
  suspended: '暫停',
  closed: '結案',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
}

const STATUS_FILTERS = [
  { value: 'active', label: '在案' },
  { value: 'suspended', label: '暫停' },
  { value: 'closed', label: '結案' },
  { value: 'all', label: '全部' },
]

export default function HomePage() {
  const { cases } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  const counts = useMemo(() => ({
    active: cases.filter(c => c.status === 'active').length,
    suspended: cases.filter(c => c.status === 'suspended').length,
    closed: cases.filter(c => c.status === 'closed').length,
  }), [cases])

  const filtered = useMemo(() => {
    return cases.filter(c => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      if (!matchStatus) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        c.name.includes(q) ||
        (c.caseNumber || '').includes(q) ||
        (c.phone || '').includes(q) ||
        (c.address || '').toLowerCase().includes(q)
      )
    })
  }, [cases, search, statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">個案列表</h2>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">在案 {counts.active}</span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">暫停 {counts.suspended}</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-medium">結案 {counts.closed}</span>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="搜尋姓名、個案編號、電話、地址..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] bg-white"
        />
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === f.value
                  ? 'bg-[#2d6a4f] text-white font-medium'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">☁️</p>
          <p className="text-lg font-medium mb-1">尚無個案資料</p>
          <p className="text-sm">請點擊左側「同步個案」按鈕，從 Google Sheet 載入資料</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>找不到符合「{search}」的個案</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(c => <CaseRow key={c.id} case_={c} />)}
        </div>
      )}
    </div>
  )
}

function CaseRow({ case_: c }: { case_: Case }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-5 py-3.5 hover:shadow-md hover:border-[#52b788]/40 transition-all group"
    >
      <div className="w-9 h-9 rounded-full bg-[#d8f3dc] flex items-center justify-center text-[#2d6a4f] font-bold text-sm flex-shrink-0">
        {c.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 group-hover:text-[#2d6a4f] transition-colors">{c.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status] || STATUS_COLOR.active}`}>
            {STATUS_LABEL[c.status] || '在案'}
          </span>
        </div>
        <div className="flex gap-4 mt-0.5 text-sm text-gray-400">
          {c.caseNumber && <span>編號 {c.caseNumber}</span>}
          {c.careLevel && <span>等級 {c.careLevel}</span>}
          {c.guardian && <span>照顧者 {c.guardian}</span>}
        </div>
      </div>
      <div className="text-right text-sm text-gray-400 flex-shrink-0 hidden sm:block">
        {c.phone && <div>{c.phone}</div>}
        {c.address && <div className="truncate max-w-[180px] text-xs mt-0.5">{c.address}</div>}
      </div>
      <span className="text-gray-300 group-hover:text-[#2d6a4f] transition-colors text-lg">›</span>
    </Link>
  )
}
