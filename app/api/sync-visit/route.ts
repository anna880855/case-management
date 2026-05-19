import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const sheetName = searchParams.get('sheetName')

  if (!url || !sheetName) {
    return NextResponse.json({ ok: false, error: 'missing params' }, { status: 400 })
  }

  try {
    const fetchUrl = `${url}?action=getVisitRecords&sheetName=${encodeURIComponent(sheetName)}`
    const res = await fetch(fetchUrl, { redirect: 'follow', cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'Apps Script 回傳錯誤')
    return NextResponse.json({ ok: true, records: json.data?.records || [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '同步失敗'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
