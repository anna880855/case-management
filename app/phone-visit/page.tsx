'use client'
import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { Case, Sentence } from '@/lib/types'

function buildPrompt(c: Case, sentences: string[], target: string, customNote: string, date: string, managerName: string): string {
  return `你是一位專業的個案管理師（${managerName}），請根據以下資訊產生一份正式的電訪紀錄，使用繁體中文，語氣專業具體。

個案資料：
- 姓名：${c.name}
- 個案編號：${c.caseNumber || ''}
- 照顧等級：${c.careLevel || ''}
- 失能狀況：${c.disability || ''}
- 目前服務：${c.services?.join('、') || ''}
- 主要照顧者：${c.guardian || ''}

電訪日期：${date}
電訪對象：${target || c.guardian || c.name}
電訪人員：${managerName}

本次電訪重點：
${sentences.length > 0 ? sentences.map(s => `- ${s}`).join('\n') : '- 例行追蹤確認'}
${customNote ? `\n補充說明：${customNote}` : ''}

請依照以下固定格式產生電訪紀錄（直接輸出格式內容，不要加任何說明文字）：

一、電訪日期：${date}
二、電訪對象：${target || c.guardian || c.name}
三、訪談內容：
（請用150-250字流暢敘述電訪過程，融入上述重點，以第三人稱書寫，不使用條列式）

一、照顧及專業服務：（根據情況填寫，如無異動則寫「服務穩定無須異動。」）
二、交通接送服務：（根據情況填寫，如無新增則寫「暫無新增照會。」）
三、輔具及居家無障礙環境改善：（根據情況填寫，如無需求則寫「無新增需求。」）
四、喘息服務：（根據情況填寫，如無需求則寫「與案家屬確認暫無需求。」）
五、轉介其他資源：（根據情況填寫，如無則寫「無轉介。」）`
}

function PhoneVisitContent() {
  const searchParams = useSearchParams()
  const { cases, sentences, settings, addPhoneVisit, getPhoneVisitsByCase } = useStore()

  const activeCases = cases.filter(c => c.status !== 'closed')
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [target, setTarget] = useState('')
  const [selectedSentences, setSelectedSentences] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [caseSearch, setCaseSearch] = useState('')

  const selectedCase = cases.find(c => c.id === selectedCaseId)
  const recentVisits = selectedCaseId ? getPhoneVisitsByCase(selectedCaseId).slice(0, 2) : []

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    if (!q) return activeCases
    return activeCases.filter(c =>
      c.name.includes(q) || (c.caseNumber || '').includes(q) || (c.phone || '').includes(q)
    )
  }, [activeCases, caseSearch])

  const sentencesByCategory = useMemo(() => {
    const cats: Record<string, Sentence[]> = {}
    sentences.forEach(s => {
      if (!cats[s.category]) cats[s.category] = []
      cats[s.category].push(s)
    })
    return cats
  }, [sentences])

  const toggleSentence = (text: string) => {
    setSelectedSentences(prev =>
      prev.includes(text) ? prev.filter(s => s !== text) : [...prev, text]
    )
  }

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
          prompt: buildPrompt(selectedCase, selectedSentences, target, customNote, date, settings.managerName),
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
    addPhoneVisit({
      id: Date.now().toString(),
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      date,
      target: target || selectedCase.guardian || selectedCase.name,
      content: generated,
      createdAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">電訪紀錄產生</h2>

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
                  onClick={() => { setSelectedCaseId(c.id); setCaseSearch(''); setGenerated(''); setSaved(false); setSelectedSentences([]) }}
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">電訪日期</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">電訪對象</label>
              <input
                type="text"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder={selectedCase?.guardian || '個案或照顧者姓名'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
          </div>

          {selectedCase && (
            <div className="bg-[#d8f3dc] rounded-xl p-4">
              <p className="font-semibold text-[#2d6a4f] text-sm">{selectedCase.name}</p>
              {selectedCase.careLevel && <p className="text-xs text-[#2d6a4f]/70 mt-1">照顧等級：{selectedCase.careLevel}</p>}
              {selectedCase.services?.length > 0 && (
                <p className="text-xs text-[#2d6a4f]/70">服務：{selectedCase.services.join('、')}</p>
              )}
              {recentVisits.length > 0 && (
                <p className="text-xs text-[#2d6a4f]/50 mt-1.5">上次電訪：{recentVisits[0].date}</p>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">
              選擇句型
              <span className="text-xs font-normal text-gray-400 ml-2">點選後 AI 會融入這些重點產生紀錄</span>
            </h3>
            {Object.entries(sentencesByCategory).map(([cat, items]) => (
              <div key={cat} className="mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleSentence(s.text)}
                      title={s.text}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        selectedSentences.includes(s.text)
                          ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-[#52b788] hover:text-[#2d6a4f]'
                      }`}
                    >
                      {s.text.length > 20 ? s.text.slice(0, 20) + '…' : s.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              補充說明 <span className="font-normal text-gray-400">（選填，本次特殊狀況）</span>
            </label>
            <textarea
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="例：個案本週回診，醫師調整血壓藥劑量..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] resize-none"
            />
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
            ) : '✨ AI 產生電訪紀錄'}
          </button>

          {generated && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">產生結果</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setGenerated(''); setSaved(false) }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500"
                  >
                    重新產生
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(generated)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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

export default function PhoneVisitPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">載入中...</div>}>
      <PhoneVisitContent />
    </Suspense>
  )
}
