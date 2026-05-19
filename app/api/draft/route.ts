import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const appsScriptUrl = searchParams.get('url')
  const caseNumber = searchParams.get('caseNumber') || ''

  if (!appsScriptUrl) return NextResponse.json({ ok: true, drafts: [] })

  try {
    const url = `${appsScriptUrl}?action=getDrafts&caseNumber=${encodeURIComponent(caseNumber)}`
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (!json.ok) throw new Error(json.error)
    return NextResponse.json({ ok: true, drafts: json.data?.drafts || [] })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, drafts: [] })
  }
}

export async function POST(req: NextRequest) {
  const { appsScriptUrl, record } = await req.json()

  if (!appsScriptUrl) return NextResponse.json({ ok: true, synced: false })

  try {
    const url = `${appsScriptUrl}?action=saveDraft&record=${encodeURIComponent(JSON.stringify(record))}`
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (!json.ok) throw new Error(json.error)
    return NextResponse.json({ ok: true, synced: true })
  } catch (err) {
    return NextResponse.json({ ok: true, synced: false, error: (err as Error).message })
  }
}

export async function DELETE(req: NextRequest) {
  const { appsScriptUrl, caseNumber, ts } = await req.json()

  if (!appsScriptUrl) return NextResponse.json({ ok: true })

  try {
    const url = `${appsScriptUrl}?action=deleteDraft&caseNumber=${encodeURIComponent(caseNumber)}&ts=${encodeURIComponent(ts)}`
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
