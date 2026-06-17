import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { appsScriptUrl, action } = body

  if (!appsScriptUrl) {
    return NextResponse.json({ ok: true, synced: false })
  }

  try {
    let url: string

    if (action === 'createCase') {
      const { fields } = body
      url = `${appsScriptUrl}?action=createCase&fields=${encodeURIComponent(JSON.stringify(fields))}`
    } else if (action === 'updateCase') {
      const { caseName, caseNumber, fields } = body
      url = `${appsScriptUrl}?action=updateCase&caseName=${encodeURIComponent(caseName)}&caseNumber=${encodeURIComponent(caseNumber || '')}&fields=${encodeURIComponent(JSON.stringify(fields))}`
    } else if (action === 'updateStatus') {
      const { caseName, caseNumber, status } = body
      url = `${appsScriptUrl}?action=updateStatus&caseName=${encodeURIComponent(caseName)}&caseNumber=${encodeURIComponent(caseNumber || '')}&status=${encodeURIComponent(status)}`
    } else if (action === 'deleteCase') {
      const { caseName, caseNumber } = body
      url = `${appsScriptUrl}?action=deleteCase&caseName=${encodeURIComponent(caseName)}&caseNumber=${encodeURIComponent(caseNumber || '')}`
    } else {
      return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 })
    }

    const res = await fetch(url, { redirect: 'follow', cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'Apps Script 回傳錯誤')

    return NextResponse.json({ ok: true, synced: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '同步失敗'
    return NextResponse.json({ ok: true, synced: false, error: msg })
  }
}
