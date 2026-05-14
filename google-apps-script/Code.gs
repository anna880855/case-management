// ====================================================
// 個案管理系統 - Google Apps Script
// 用途：讓 Next.js 網站可從 Google Sheet 同步個案資料
// ====================================================
// 使用說明：
// 1. 開啟 Google Sheet「個案資料管理」
// 2. 點選「擴充功能」→「Apps Script」
// 3. 貼上此程式碼，修改下方 SHEET_NAME
// 4. 部署 → 新增部署作業 → 網頁應用程式
//    執行身分：「我」，存取：「所有人」
// 5. 複製網址到系統設定
// ====================================================

const SHEET_NAME = '個案資料管理'; // ← 修改為您的工作表名稱

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getCasesOnly';
  try {
    let result;
    if (action === 'getCasesOnly') {
      result = { cases: getCases() };
    } else {
      throw new Error('Unknown action: ' + action);
    }
    return output({ ok: true, data: result });
  } catch (err) {
    return output({ ok: false, error: err.message });
  }
}

function getCases() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(function(h) { return String(h).trim(); });
  const rows = data.slice(1);

  // 欄位對應（支援各種中文欄位名稱）
  const FIELD_MAP = {
    '姓名': 'name', '個案姓名': 'name',
    '個案編號': 'caseNumber', '編號': 'caseNumber',
    '電話': 'phone', '聯絡電話': 'phone', '手機': 'phone',
    '地址': 'address', '居住地址': 'address',
    '生日': 'birthDate', '出生日期': 'birthDate', '生日（西元）': 'birthDate',
    '身分證': 'idNumber', '身分證字號': 'idNumber', '證號': 'idNumber',
    '狀態': 'status', '在案狀態': 'status', '個案狀態': 'status',
    '開案日期': 'startDate', '開案': 'startDate',
    '照顧等級': 'careLevel', '長照等級': 'careLevel', '失能等級': 'careLevel',
    '失能狀況': 'disability', '失能': 'disability',
    '主要照顧者': 'guardian', '照顧者': 'guardian', '家屬': 'guardian',
    '照顧者電話': 'guardianPhone', '家屬電話': 'guardianPhone',
    '服務項目': 'services', '使用服務': 'services', '服務': 'services',
    '備註': 'notes', '注意事項': 'notes',
  };

  const STATUS_MAP = {
    '在案': 'active', '服務中': 'active', 'active': 'active',
    '暫停': 'suspended', '暫停服務': 'suspended', 'suspended': 'suspended',
    '結案': 'closed', '已結案': 'closed', 'closed': 'closed',
  };

  return rows
    .filter(function(row) { return row[0] && String(row[0]).trim(); })
    .map(function(row, idx) {
      const obj = { id: String(idx + 1), status: 'active', services: [] };
      headers.forEach(function(h, i) {
        const field = FIELD_MAP[h];
        if (!field) return;
        const val = String(row[i] !== null && row[i] !== undefined ? row[i] : '').trim();
        if (field === 'status') {
          obj.status = STATUS_MAP[val] || 'active';
        } else if (field === 'services') {
          obj.services = val ? val.split(/[,、，；;]/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
        } else {
          obj[field] = val;
        }
      });
      return obj;
    });
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
