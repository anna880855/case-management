import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { appsScriptUrl, sheetName, record } = await req.json()

  if (!appsScriptUrl) {
    return NextResponse.json({ ok: true, synced: false })
  }

  try {
    const url = `${appsScriptUrl}?action=saveVisitRecord&sheetName=${encodeURIComponent(sheetName)}&record=${encodeURIComponent(JSON.stringify(record))}`
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
