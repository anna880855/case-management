#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
個案電訪管理系統 — 雲端同步補丁腳本
使用方式：把此 .py 檔和你的 HTML 放在同一資料夾，執行後會產生新的 HTML 檔。
需要 Python 3（Windows/Mac 都內建）。
"""

import os, sys, re

# ── 找 HTML 檔 ──
html_files = [f for f in os.listdir('.') if f.endswith('.html')]
if not html_files:
    print('❌ 找不到 HTML 檔案，請把 patch.py 和 HTML 放在同一資料夾')
    input('按 Enter 結束')
    sys.exit(1)

if len(html_files) > 1:
    print('找到多個 HTML 檔案：')
    for i, f in enumerate(html_files): print(f'  {i+1}. {f}')
    n = input('請輸入要修改的編號：').strip()
    src = html_files[int(n)-1]
else:
    src = html_files[0]

print(f'✅ 選擇檔案：{src}')
with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 要插入的雲端同步程式碼 ──
CLOUD_SYNC_JS = r"""
// =====================================================
// ☁️ 雲端同步層 (Google Apps Script)
// 自動插入 by patch.py
// =====================================================

var APPS_SCRIPT_URL = ''; // ← 填入你的 Apps Script 部署 URL

var _syncEl = null;
function _showSync(msg, color) {
  if (!_syncEl) {
    _syncEl = document.createElement('div');
    _syncEl.style.cssText = 'position:fixed;bottom:12px;right:16px;z-index:9999;font-size:11px;padding:5px 12px;border-radius:20px;font-family:sans-serif;transition:opacity 0.4s;pointer-events:none';
    document.body.appendChild(_syncEl);
  }
  _syncEl.textContent = msg;
  _syncEl.style.background = color || '#2d6a4f';
  _syncEl.style.color = '#fff';
  _syncEl.style.opacity = '1';
}
function _hideSync(delay) {
  setTimeout(function(){ if (_syncEl) _syncEl.style.opacity = '0'; }, delay || 2000);
}

async function _api(action, body) {
  if (!APPS_SCRIPT_URL) throw new Error('請先設定 APPS_SCRIPT_URL');
  var url = APPS_SCRIPT_URL + '?action=' + action;
  var opts = { method: 'GET', redirect: 'follow' };
  if (body) {
    opts.method = 'POST';
    opts.headers = { 'Content-Type': 'text/plain' };
    opts.body = JSON.stringify(body);
  }
  var res = await fetch(url, opts);
  var json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API 錯誤');
  return json.data;
}

var _cloudReady = false;

async function initCloudSync() {
  if (!APPS_SCRIPT_URL) {
    console.warn('[雲端同步] 未設定 URL，僅使用本機儲存');
    return;
  }
  _showSync('☁️ 同步中…', '#888');
  try {
    var data = await _api('exportAll');
    if (data.cases && data.cases.length > 0) {
      localStorage.setItem('cases', JSON.stringify(data.cases));
      cases = data.cases;
    }
    if (data.records && data.records.length > 0) {
      localStorage.setItem('records', JSON.stringify(data.records));
      records = data.records;
    }
    if (data.sentences && data.sentences.length > 0) {
      localStorage.setItem('sentences', JSON.stringify(data.sentences));
      sentences = data.sentences;
    }
    if (data.config && Object.keys(data.config).length > 0) {
      var cfg = {};
      Object.keys(data.config).forEach(function(k){ cfg[k] = data.config[k]; });
      localStorage.setItem('sys_config', JSON.stringify(cfg));
    }
    _cloudReady = true;
    _showSync('☁️ 已同步', '#2d6a4f');
    _hideSync(2000);
    renderDashboard();
  } catch(e) {
    _showSync('⚠️ 雲端同步失敗，使用本機資料', '#e07b39');
    _hideSync(4000);
    console.error('[雲端同步] 初始化失敗：', e);
  }
}

var _origSaveData = null;

function saveData(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  if (!APPS_SCRIPT_URL) return;
  if (key === 'cases') {
    _showSync('☁️ 儲存中…', '#888');
    _api('importAll', { cases: val })
      .then(function(){ _showSync('☁️ 已儲存', '#2d6a4f'); _hideSync(); })
      .catch(function(e){ _showSync('⚠️ 雲端儲存失敗', '#e07b39'); _hideSync(4000); });
  } else if (key === 'records') {
    _showSync('☁️ 儲存中…', '#888');
    _api('importAll', { records: val })
      .then(function(){ _showSync('☁️ 已儲存', '#2d6a4f'); _hideSync(); })
      .catch(function(e){ _showSync('⚠️ 雲端儲存失敗', '#e07b39'); _hideSync(4000); });
  } else if (key === 'sentences') {
    _showSync('☁️ 儲存中…', '#888');
    _api('saveAllSentences', { sentences: val })
      .then(function(){ _showSync('☁️ 已儲存', '#2d6a4f'); _hideSync(); })
      .catch(function(e){ _showSync('⚠️ 雲端儲存失敗', '#e07b39'); _hideSync(4000); });
  } else if (key === 'sys_config') {
    _api('saveConfig', val).catch(function(){});
  }
}

async function forceSyncFromCloud() {
  _showSync('☁️ 重新同步中…', '#888');
  try {
    var data = await _api('exportAll');
    if (data.cases)     { localStorage.setItem('cases',     JSON.stringify(data.cases));     cases     = data.cases; }
    if (data.records)   { localStorage.setItem('records',   JSON.stringify(data.records));   records   = data.records; }
    if (data.sentences) { localStorage.setItem('sentences', JSON.stringify(data.sentences)); sentences = data.sentences; }
    _showSync('☁️ 同步完成！', '#2d6a4f');
    _hideSync(2000);
    renderDashboard();
    alert('✅ 已從雲端重新同步所有資料');
  } catch(e) {
    _showSync('⚠️ 同步失敗', '#e07b39');
    _hideSync(4000);
    alert('❌ 同步失敗：' + e.message);
  }
}
// =====================================================
"""

# ── Patch 1：在 <script> 最開頭插入雲端同步程式碼 ──
OLD_SCRIPT_MARKER = '// ========== DATA STORE =========='
if OLD_SCRIPT_MARKER not in html:
    print('❌ 找不到插入點「DATA STORE」，HTML 格式可能不符，請聯繫技術支援')
    input('按 Enter 結束')
    sys.exit(1)

html = html.replace(OLD_SCRIPT_MARKER, CLOUD_SYNC_JS + '\n' + OLD_SCRIPT_MARKER, 1)
print('✅ Patch 1：雲端同步程式碼已插入')

# ── Patch 2：在 DOMContentLoaded 末端加上 initCloudSync() ──
OLD_INIT = '  renderDashboard();\n});'
NEW_INIT = '  renderDashboard();\n  // ☁️ 雲端同步初始化\n  setTimeout(initCloudSync, 500);\n});'
if OLD_INIT in html:
    html = html.replace(OLD_INIT, NEW_INIT, 1)
    print('✅ Patch 2：initCloudSync 已加入 DOMContentLoaded')
else:
    print('⚠️  Patch 2 跳過（找不到插入點，請手動在 DOMContentLoaded 末尾加上 initCloudSync()）')

# ── Patch 3：在側邊欄 footer 加上同步按鈕 ──
OLD_FOOTER = "<div id=\"api-key-status\""
NEW_FOOTER = """<button type="button" onclick="forceSyncFromCloud()" style="width:100%;margin-bottom:6px;padding:5px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:11px">☁️ 強制同步雲端</button>
      <div id="api-key-status\""""
if OLD_FOOTER in html:
    html = html.replace(OLD_FOOTER, NEW_FOOTER, 1)
    print('✅ Patch 3：強制同步按鈕已加入側邊欄')
else:
    print('⚠️  Patch 3 跳過（找不到 api-key-status，請手動加入按鈕）')

# ── Patch 4：在設定頁加上 Apps Script URL 輸入欄 ──
OLD_SETTINGS_PANEL = '<div class="form-group">\n                <label>Anthropic API Key</label>'
NEW_SETTINGS_PANEL = """<div class="form-group">
                <label>☁️ Apps Script URL（雲端同步）</label>
                <input type="text" id="s-apps-script-url" placeholder="https://script.google.com/macros/s/…/exec">
                <div style="font-size:11px;color:var(--text3);margin-top:4px">填入後點「儲存設定」，重新整理頁面即開始同步</div>
              </div>
              <div class="form-group">
                <label>Anthropic API Key</label>"""
if OLD_SETTINGS_PANEL in html:
    html = html.replace(OLD_SETTINGS_PANEL, NEW_SETTINGS_PANEL, 1)
    print('✅ Patch 4：Apps Script URL 輸入欄已加入設定頁')
else:
    # Try alternate spacing
    ALT = '<div class="form-group">\n              <label>Anthropic API Key</label>'
    if ALT in html:
        html = html.replace(ALT, NEW_SETTINGS_PANEL.replace('                <label>Anthropic', '              <label>Anthropic'), 1)
        print('✅ Patch 4（alt）：Apps Script URL 輸入欄已加入設定頁')
    else:
        print('⚠️  Patch 4 跳過（請在設定頁手動加入 Apps Script URL 欄位）')

# ── Patch 5：settingsInit() 讀取 URL ──
OLD_SETTINGS_INIT = "  document.getElementById('s-api-key').value      = getApiKey()     || '';"
NEW_SETTINGS_INIT = """  document.getElementById('s-api-key').value      = getApiKey()     || '';
  var urlEl = document.getElementById('s-apps-script-url');
  if (urlEl) urlEl.value = localStorage.getItem('apps_script_url') || APPS_SCRIPT_URL || '';"""
if OLD_SETTINGS_INIT in html:
    html = html.replace(OLD_SETTINGS_INIT, NEW_SETTINGS_INIT, 1)
    print('✅ Patch 5：settingsInit 讀取 URL 已加入')
else:
    print('⚠️  Patch 5 跳過')

# ── Patch 6：saveSettings() 儲存 URL ──
OLD_SAVE_SETTINGS = "  var key = document.getElementById('s-api-key').value.trim();"
NEW_SAVE_SETTINGS = """  var urlEl2 = document.getElementById('s-apps-script-url');
  if (urlEl2 && urlEl2.value.trim()) {
    var newUrl = urlEl2.value.trim();
    localStorage.setItem('apps_script_url', newUrl);
    APPS_SCRIPT_URL = newUrl;
  }
  var key = document.getElementById('s-api-key').value.trim();"""
if OLD_SAVE_SETTINGS in html:
    html = html.replace(OLD_SAVE_SETTINGS, NEW_SAVE_SETTINGS, 1)
    print('✅ Patch 6：saveSettings 儲存 URL 已加入')
else:
    print('⚠️  Patch 6 跳過')

# ── Patch 7：啟動時讀取已儲存的 URL ──
OLD_DOM_READY = 'document.addEventListener(\'DOMContentLoaded\', function() {'
NEW_DOM_READY = """document.addEventListener('DOMContentLoaded', function() {
  // 讀取已儲存的 Apps Script URL
  var _savedUrl = localStorage.getItem('apps_script_url');
  if (_savedUrl) APPS_SCRIPT_URL = _savedUrl;"""
if OLD_DOM_READY in html:
    html = html.replace(OLD_DOM_READY, NEW_DOM_READY, 1)
    print('✅ Patch 7：啟動時讀取 URL 已加入')
else:
    print('⚠️  Patch 7 跳過')

# ── 輸出新 HTML ──
out_name = src.replace('.html', '_雲端版.html')
with open(out_name, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\n🎉 完成！新檔案已產生：{out_name}')
print('接下來請依照「設定說明.md」的步驟完成 Google Apps Script 部署，')
print('然後在新版 HTML 的「⚙️ 系統設定」頁面填入 Apps Script URL 並儲存。')
input('\n按 Enter 結束')
