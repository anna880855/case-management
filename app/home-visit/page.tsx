'use client'
import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { Case } from '@/lib/types'

const ASSESSMENT_FIELDS = [
  { key: 'diseaseHistory', label: '疾病史', placeholder: '例：高血壓、糖尿病、心臟病、中風...' },
  { key: 'caseCondition', label: '個案狀況', placeholder: '目前身體功能、活動能力、ADL/IADL 狀況...' },
  { key: 'caregiverAssessment', label: '主要照顧者評估', placeholder: '照顧者身心狀況、照顧負荷、支持需求...' },
  { key: 'problems', label: '照顧問題', placeholder: '列出主要照顧問題（可用1.2.分點）' },
  { key: 'shortTermGoal', label: '短期目標', placeholder: '預計3個月內達成的目標...' },
  { key: 'midTermGoal', label: '中期目標', placeholder: '預計6個月內達成的目標...' },
  { key: 'longTermGoal', label: '長期目標', placeholder: '長期照顧目標...' },
  { key: 'formalCareService', label: '照顧及專業服務', placeholder: '目前使用的正式照顧服務（居家服務、日照等）...' },
  { key: 'transportService', label: '交通接送服務', placeholder: '例：1840元/月，至台北馬偕醫院，或「暫無需求」' },
  { key: 'assistiveDevice', label: '輔具及居家無障礙', placeholder: '輔具需求或居家環境改善需求，或「暫無需求」' },
  { key: 'respiteService', label: '喘息服務', placeholder: '喘息服務使用狀況及剩餘額度...' },
  { key: 'referral', label: '轉介其他資源', placeholder: '轉介內容，或「暫無」' },
]

function buildPrompt(c: Case, guardian: string, assessment: Record<string, string>, date: string, managerName: string, managerPhone: string): string {
  const year = new Date(date).getFullYear() - 1911
  const month = new Date(date).getMonth() + 1
  const day = new Date(date).getDate()

  return `你是一位專業的長照個案管理師，請根據以下評估內容，依照固定格式產生家訪記錄，使用繁體中文，語氣客觀專業。

個案資料：
- 姓名：${c.name}
- 個案編號：${c.caseNumber || ''}
- 照顧等級：${c.careLevel || ''}
- 失能狀況：${c.disability || ''}
- 主要照顧者：${c.guardian || guardian}
- 地址：${c.address || ''}
- 目前服務：${c.services?.join('、') || ''}

家訪日期：民國${year}年${month}月${day}日
家訪人員：個管${managerName} ${managerPhone}
家屬/陪同者：${guardian || c.guardian || ''}

評估內容：
${Object.entries(assessment).filter(([, v]) => v.trim()).map(([k, v]) => {
  const field = ASSESSMENT_FIELDS.find(f => f.key === k)
  return `【${field?.label || k}】${v}`
}).join('\n')}

請依照以下固定格式輸出（直接輸出，不要加說明文字或標題之外的內容）：

一、本案於民國${year}年${month}月${day}日家訪，與個案及家屬${guardian || c.guardian || ''}討論照顧計畫/個管${managerName} ${managerPhone}。
二、個案摘述
1.疾病史：${assessment.diseaseHistory || '（請根據評估填寫）'}
2.個案狀況：（根據個案狀況資料，用2-4句具體描述現況）
3.主要照顧者評估：（根據照顧者評估資料，用2-3句描述）
三、照顧問題
（將照顧問題整理為條列式，至少2點）
四、照顧計畫目標
1.短期目標：${assessment.shortTermGoal || '（根據評估填寫）'}
2.中期目標：${assessment.midTermGoal || '（根據評估填寫）'}
3.長期目標：${assessment.longTermGoal || '（根據評估填寫）'}

一、照顧及專業服務：${assessment.formalCareService || '（根據服務使用情形填寫）'}
二、交通接送服務：${assessment.transportService || '暫無需求。'}
三、輔具及居家無障礙環境改善服務：${assessment.assistiveDevice || '暫無需求。'}
四、喘息服務/短照服務：${assessment.respiteService || '（根據喘息使用情形填寫）'}
五、轉介其他資源：${assessment.referral || '暫無。'}`
}

function HomeVisitContent() {
  const searchParams = useSearchParams()
  const { cases, settings, addHomeVisit, getHomeVisitsByCase } = useStore()

  const activeCases = cases.filter(c => c.status !== 'closed')
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [guardian, setGuardian] = useState('')
  const [assessment, setAssessment] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [caseSearch, setCaseSearch] = useState('')

  const selectedCase = cases.find(c => c.id === selectedCaseId)
  const recentVisits = selectedCaseId ? getHomeVisitsByCase(selectedCaseId).slice(0, 2) : []

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    if (!q) return activeCases
    return activeCases.filter(c =>
      c.name.includes(q) || (c.caseNumber || '').includes(q) || (c.phone || '').includes(q)
    )
  }, [activeCases, caseSearch])

  const setField = (key: string, value: string) =>
    setAssessment(prev => ({ ...prev, [key]: value }))

  const handleGenerate = async () => {
    if (!selectedCase) { setError('請選擇個案'); return }
    if (!settings.claudeApiKey) { setError('請先在「設定」頁面填入 Claude API Key'); return }
    setGenerating(true)
    setError('')
    setGenerated('')
    setSaved(false)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildPrompt(selectedCase, guardian, assessment, date, settings.managerName, settings.managerPhone),
          apiKey: settings.claudeApiKey,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGenerated(data.content)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '產生失敗，請再試一次')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = () => {
    if (!selectedCase || !generated) return
    addHomeVisit({
      id: Date.now().toString(),
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      date,
      planContent: generated,
      createdAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">家訪計劃產生</h2>

      <div className="grid grid-cols-[280px,1fr] gap-6">
        {/* Left panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">選擇個案</label>
            <input
              type="text"
              placeholder="搜尋..."
              value={caseSearch}
              onChange={e => setCaseSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filteredCases.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCaseId(c.id); setCaseSearch(''); setGenerated(''); setSaved(false); setAssessment({}) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCaseId === c.id
                      ? 'bg-[#d8f3dc] text-[#2d6a4f] font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  {c.caseNumber && <div className="text-xs text-gray-400">{c.caseNumber}</div>}
                </button>
              ))}
              {filteredCases.length === 0 && <p className="text-sm text-gray-400 px-3 py-2">找不到個案</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">家訪日期</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">陪同家屬</label>
              <input
                type="text"
                value={guardian}
                onChange={e => setGuardian(e.target.value)}
                placeholder={selectedCase?.guardian || '家屬姓名'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
          </div>

          {selectedCase && (
            <div className="bg-[#d8f3dc] rounded-xl p-4">
              <p className="font-semibold text-[#2d6a4f] text-sm">{selectedCase.name}</p>
              {selectedCase.careLevel && <p className="text-xs text-[#2d6a4f]/70 mt-1">照顧等級：{selectedCase.careLevel}</p>}
              {selectedCase.disability && <p className="text-xs text-[#2d6a4f]/70">失能：{selectedCase.disability}</p>}
              {recentVisits.length > 0 && (
                <p className="text-xs text-[#2d6a4f]/50 mt-1.5">上次家訪：{recentVisits[0].date}</p>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">家訪評估填寫</h3>
            <div className="grid grid-cols-2 gap-4">
              {ASSESSMENT_FIELDS.map(field => (
                <div key={field.key} className={field.key === 'problems' || field.key === 'caseCondition' || field.key === 'caregiverAssessment' ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {field.label}
                  </label>
                  <textarea
                    value={assessment[field.key] || ''}
                    onChange={e => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.key === 'problems' || field.key === 'caseCondition' ? 3 : 2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedCaseId}
            className="w-full py-3 bg-[#2d6a4f] text-white rounded-xl font-semibold hover:bg-[#1b4332] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 產生中，請稍候...
              </>
            ) : '✨ AI 產生家訪計劃'}
          </button>

          {generated && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">產生結果</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setGenerated(''); setSaved(false) }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                  >
                    重新產生
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(generated)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    📋 複製
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      saved ? 'bg-green-100 text-green-700' : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
                    }`}
                  >
                    {saved ? '✓ 已儲存' : '💾 儲存'}
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-lg p-4">{generated}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HomeVisitPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">載入中...</div>}>
      <HomeVisitContent />
    </Suspense>
  )
}
