import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Case, PhoneVisitRecord, HomeVisitRecord, Sentence, Settings } from './types'

const DEFAULT_SENTENCES: Sentence[] = [
  { id: '1', category: '健康狀況', text: '詢問近期身體狀況，個案表示穩定，無特殊不適。' },
  { id: '2', category: '健康狀況', text: '個案近期有就醫，目前服藥中，狀況穩定。' },
  { id: '3', category: '健康狀況', text: '個案表示近期身體較虛弱，已提醒注意休息及補充營養。' },
  { id: '4', category: '用藥', text: '確認個案規律服藥，無漏服情形。' },
  { id: '5', category: '用藥', text: '提醒個案按時服藥，個案表示了解並配合。' },
  { id: '6', category: '生活狀況', text: '日常生活起居正常，飲食規律，睡眠品質尚可。' },
  { id: '7', category: '生活狀況', text: '家人協助照顧，照顧者狀況穩定，無喘息需求。' },
  { id: '8', category: '服務使用', text: '確認正常使用長照服務，無問題反應，服務穩定。' },
  { id: '9', category: '服務使用', text: '個案對目前服務表示滿意，無調整需求。' },
  { id: '10', category: '心理情緒', text: '個案情緒穩定，對目前生活狀況表示適應良好。' },
  { id: '11', category: '心理情緒', text: '個案表達情緒低落，給予傾聽與支持，並評估後續需求。' },
  { id: '12', category: '照顧者', text: '主要照顧者表示照顧壓力尚可承受，無立即喘息需求。' },
  { id: '13', category: '照顧者', text: '照顧者反應疲憊，已告知喘息服務申請方式並協助評估。' },
  { id: '14', category: '需求確認', text: '詢問近期是否有額外需求，個案及家屬表示無。' },
  { id: '15', category: '需求確認', text: '個案提出輔具需求，已記錄並將協助評估申請。' },
  { id: '16', category: '結語', text: '告知如有任何問題可隨時聯繫個管師，個案表示了解。' },
  { id: '17', category: '結語', text: '提醒下次回訪時間，個案表示知悉並同意配合。' },
]

interface StoreState {
  cases: Case[]
  phoneVisits: PhoneVisitRecord[]
  homeVisits: HomeVisitRecord[]
  sentences: Sentence[]
  settings: Settings
}

interface StoreActions {
  setCases: (cases: Case[]) => void
  addPhoneVisit: (visit: PhoneVisitRecord) => void
  deletePhoneVisit: (id: string) => void
  addHomeVisit: (visit: HomeVisitRecord) => void
  deleteHomeVisit: (id: string) => void
  addSentence: (sentence: Sentence) => void
  deleteSentence: (id: string) => void
  setSentences: (sentences: Sentence[]) => void
  updateSettings: (settings: Partial<Settings>) => void
  getCaseById: (id: string) => Case | undefined
  getPhoneVisitsByCase: (caseId: string) => PhoneVisitRecord[]
  getHomeVisitsByCase: (caseId: string) => HomeVisitRecord[]
}

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      cases: [],
      phoneVisits: [],
      homeVisits: [],
      sentences: DEFAULT_SENTENCES,
      settings: {
        appsScriptUrl: '',
        claudeApiKey: '',
        organizationName: '',
        managerName: '林侑萱',
        managerPhone: '0902692567',
      },

      setCases: (cases) => set({ cases }),

      addPhoneVisit: (visit) =>
        set((state) => ({ phoneVisits: [visit, ...state.phoneVisits] })),

      deletePhoneVisit: (id) =>
        set((state) => ({ phoneVisits: state.phoneVisits.filter((v) => v.id !== id) })),

      addHomeVisit: (visit) =>
        set((state) => ({ homeVisits: [visit, ...state.homeVisits] })),

      deleteHomeVisit: (id) =>
        set((state) => ({ homeVisits: state.homeVisits.filter((v) => v.id !== id) })),

      addSentence: (sentence) =>
        set((state) => ({ sentences: [...state.sentences, sentence] })),

      deleteSentence: (id) =>
        set((state) => ({ sentences: state.sentences.filter((s) => s.id !== id) })),

      setSentences: (sentences) => set({ sentences }),

      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),

      getCaseById: (id) => get().cases.find((c) => c.id === id),

      getPhoneVisitsByCase: (caseId) =>
        get().phoneVisits.filter((v) => v.caseId === caseId),

      getHomeVisitsByCase: (caseId) =>
        get().homeVisits.filter((v) => v.caseId === caseId),
    }),
    { name: 'case-mgmt-v1' }
  )
)
