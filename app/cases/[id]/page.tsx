'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const { getCaseById, getPhoneVisitsByCase, getHomeVisitsByCase } = useStore()
  const c = getCaseById(params.id)
  const phoneVisits = getPhoneVisitsByCase(params.id)
  const homeVisits = getHomeVisitsByCase(params.id)

  if (!c) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="mb-4">找不到此個案</p>
        <Link href="/" className="text-[#2d6a4f] hover:underline">← 返回列表</Link>
      </div>
    )
  }

  const statusLabel = c.status === 'active' ? '在案' : c.status === 'suspended' ? '暫停' : '結案'
  const statusColor = c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
        <div className="w-px h-4 bg-gray-200" />
        <h2 className="text-2xl font-bold text-gray-800">{c.name}</h2>
        <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-50">基本資料</h3>
          <dl className="space-y-2.5">
            <InfoRow label="個案編號" value={c.caseNumber} />
            <InfoRow label="生日" value={c.birthDate} />
            <InfoRow label="身分證" value={c.idNumber} />
            <InfoRow label="電話" value={c.phone} />
            <InfoRow label="地址" value={c.address} />
            <InfoRow label="開案日期" value={c.startDate} />
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-50">照顧資訊</h3>
          <dl className="space-y-2.5">
            <InfoRow label="照顧等級" value={c.careLevel} />
            <InfoRow label="失能狀況" value={c.disability} />
            <InfoRow label="主要照顧者" value={c.guardian} />
            <InfoRow label="照顧者電話" value={c.guardianPhone} />
          </dl>
          {c.services && c.services.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <dt className="text-xs text-gray-400 mb-1.5">服務項目</dt>
              <div className="flex flex-wrap gap-1">
                {c.services.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#d8f3dc] text-[#2d6a4f] rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {c.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
          <h3 className="font-medium text-amber-800 mb-1 text-sm">備註</h3>
          <p className="text-sm text-amber-700 whitespace-pre-wrap">{c.notes}</p>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <Link
          href={`/phone-visit?caseId=${c.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#2d6a4f] text-white rounded-xl hover:bg-[#1b4332] transition-colors font-medium"
        >
          📞 產生電訪紀錄
        </Link>
        <Link
          href={`/home-visit?caseId=${c.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-[#2d6a4f] text-[#2d6a4f] rounded-xl hover:bg-[#d8f3dc] transition-colors font-medium"
        >
          🏠 產生家訪計劃
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <VisitHistory
          title="電訪紀錄"
          visits={phoneVisits.map(v => ({ id: v.id, date: v.date, preview: v.content }))}
        />
        <VisitHistory
          title="家訪紀錄"
          visits={homeVisits.map(v => ({ id: v.id, date: v.date, preview: v.planContent }))}
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <dt className="w-24 text-xs text-gray-400 pt-0.5 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-700">{value}</dd>
    </div>
  )
}

function VisitHistory({ title, visits }: { title: string; visits: { id: string; date: string; preview: string }[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-700 mb-3">
        {title} <span className="text-gray-400 font-normal text-sm">({visits.length})</span>
      </h3>
      {visits.length === 0 ? (
        <p className="text-sm text-gray-400">尚無紀錄</p>
      ) : (
        <div className="space-y-2">
          {visits.slice(0, 5).map(v => (
            <div key={v.id} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">{v.date}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{v.preview}</p>
            </div>
          ))}
          {visits.length > 5 && (
            <p className="text-xs text-gray-400 text-center">還有 {visits.length - 5} 筆...</p>
          )}
        </div>
      )}
    </div>
  )
}
