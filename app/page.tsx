'use client'
import { useState, useMemo, useEffect } from 'react'
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

type VisitFilter = 'all' | 'no-phone' | 'no-home'

function useVisitStatus(caseId: string) {
  const { phoneVisits, homeVisits } = useStore()
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const hasPhoneThisMonth = phoneVisits.some(v => {
    if (v.caseId !== caseId) return false
    const d = new Date(v.date)
    return d.getFullYear() === thisYear && d.getMonth() === thisMonth
  })

  const hasHomeInSixMonths = homeVisits.some(v => {
    if (v.caseId !== caseId) return false
    const d = new Date(v.date)
    return d >= sixMonthsAgo
  })

  return { hasPhoneThisMonth, hasHomeInSixMonths }
}

export default function HomePage() {
  const { cases, phoneVisits, homeVisits } = useStore()
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [visitFilter, setVisitFilter] = useState<VisitFilter>('all')
  useEffect(() => { setMounted(true) }, [])

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const activeCases = useMemo(() => cases.filter(c => c.status === 'active'), [cases])

  const noPhoneThisMonth = useMemo(() => activeCases.filter(c => {
    return !phoneVisits.some(v => {
      if (v.caseId !== c.id) return false
      const d = new Date(v.date)
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth
    })
  }), [activeCases, phoneVisits, thisYear, thisMonth])

  const noHomeInSixMonths = useMemo(() => activeCases.filter(c => {
    // 優先用 Google Sheet 的最近家訪日
    if (c.lastHomeVisitDate) {
      const d = new Date(c.lastHomeVisitDate)
      if (!isNaN(d.getTime())) return d < sixMonthsAgo
    }
    return !homeVisits.some(v => {
      if (v.caseId !== c.id) return false
      return new Date(v.date) >= sixMonthsAgo
    })
  }), [activeCases, homeVisits, sixMonthsAgo])

  const counts = useMemo(() => ({
    active: cases.filter(c => c.status === 'active').length,
    suspended: cases.filter(c => c.status === 'suspended').length,
    closed: cases.filter(c => c.status === 'closed').length,
  }), [cases])

  const filtered = useMemo(() => {
    let pool = cases
    if (visitFilter === 'no-phone') pool = noPhoneThisMonth
    else if (visitFilter === 'no-home') pool = noHomeInSixMonths
    else pool = cases.filter(c => statusFilter === 'all' || c.status === statusFilter)

    const q = search.trim().toLowerCase()
    if (!q) return pool
    return pool.filter(c =>
      c.name.includes(q) ||
      (c.caseNumber || '').includes(q) ||
      (c.phone || '').includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    )
  }, [cases, search, statusFilter, visitFilter, noPhoneThisMonth, noHomeInSixMonths])

  if (!mounted) return <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">個案列表</h2>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">在案 {counts.active}</span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">暫停 {counts.suspended}</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-medium">結案 {counts.closed}</span>
        </div>
      </div>

      {/* 待訪視提醒 */}
      {cases.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setVisitFilter(v => v === 'no-phone' ? 'all' : 'no-phone')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              visitFilter === 'no-phone'
                ? 'bg-red-50 border-red-200 ring-2 ring-red-200'
                : 'bg-white border-gray-100 hover:border-red-200'
            }`}
          >
            <div className="text-left">
              <p className="text-xs text-gray-500">本月未電訪</p>
              <p className="text-2xl font-bold text-red-500">{noPhoneThisMonth.length}</p>
              <p className="text-xs text-gray-400">位在案個案</p>
            </div>
            <span className="text-2xl">📞</span>
          </button>
          <button
            onClick={() => setVisitFilter(v => v === 'no-home' ? 'all' : 'no-home')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              visitFilter === 'no-home'
                ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-200'
                : 'bg-white border-gray-100 hover:border-orange-200'
            }`}
          >
            <div className="text-left">
              <p className="text-xs text-gray-500">6個月未家訪</p>
              <p className="text-2xl font-bold text-orange-500">{noHomeInSixMonths.length}</p>
              <p className="text-xs text-gray-400">位在案個案</p>
            </div>
            <span className="text-2xl">🏠</span>
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="搜尋姓名、個案編號、電話、地址..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] bg-white"
        />
        {visitFilter === 'all' && (
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
        )}
        {visitFilter !== 'all' && (
          <button
            onClick={() => setVisitFilter('all')}
            className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            ✕ 清除篩選
          </button>
        )}
      </div>

      {visitFilter !== 'all' && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-medium ${
          visitFilter === 'no-phone' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
        }`}>
          {visitFilter === 'no-phone' ? `📞 本月（${thisMonth + 1}月）尚未電訪的在案個案` : '🏠 近6個月尚未家訪的在案個案'}
          {' '}共 {filtered.length} 位
        </div>
      )}

      {cases.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">☁️</p>
          <p className="text-lg font-medium mb-1">尚無個案資料</p>
          <p className="text-sm">請點擊左側「同步個案」按鈕，從 Google Sheet 載入資料</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>{search ? `找不到符合「${search}」的個案` : '所有個案均已完成訪視'}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(c => <CaseRow key={c.id} case_={c} visitFilter={visitFilter} />)}
        </div>
      )}
    </div>
  )
}

function CaseRow({ case_: c, visitFilter }: { case_: Case; visitFilter: VisitFilter }) {
  const { hasPhoneThisMonth, hasHomeInSixMonths } = useVisitStatus(c.id)

  return (
    <Link
      href={`/cases/${c.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-5 py-3.5 hover:shadow-md hover:border-[#52b788]/40 transition-all group"
    >
      <div className="w-9 h-9 rounded-full bg-[#d8f3dc] flex items-center justify-center text-[#2d6a4f] font-bold text-sm flex-shrink-0">
        {c.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-800 group-hover:text-[#2d6a4f] transition-colors">{c.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status] || STATUS_COLOR.active}`}>
            {STATUS_LABEL[c.status] || '在案'}
          </span>
          {c.status === 'active' && !hasPhoneThisMonth && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">未電訪</span>
          )}
          {c.status === 'active' && !hasHomeInSixMonths && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">未家訪</span>
          )}
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
