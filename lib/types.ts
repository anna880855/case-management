export interface Case {
  id: string
  name: string
  caseNumber: string
  phone: string
  address: string
  birthDate: string
  idNumber: string
  gender?: string
  status: 'active' | 'suspended' | 'closed'
  startDate: string
  careLevel: string
  disability: string
  guardian: string
  guardianPhone: string
  notes: string
  notes2?: string
  services: string[]
  visitTarget?: string
  lastHomeVisitDate?: string
  homeVisitIntervalMonths?: string
  shortGoal?: string
  midGoal?: string
  longGoal?: string
  responsibleWorker?: string
}

export interface PhoneVisitRecord {
  id: string
  caseId: string
  caseName: string
  date: string
  target: string
  content: string
  createdAt: string
}

export interface HomeVisitRecord {
  id: string
  caseId: string
  caseName: string
  date: string
  planContent: string
  createdAt: string
}

export interface Sentence {
  id: string
  category: string
  text: string
}

export interface Settings {
  appsScriptUrl: string
  claudeApiKey: string
  organizationName: string
  managerName: string
  managerPhone: string
}
