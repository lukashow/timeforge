import type { Subject } from '@/types/resources'

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: '1', name: '数学', shortName: 'MAT', color: '#8B5CF6', requiresLab: false },
  { id: '2', name: '英语', shortName: 'ENG', color: '#EC4899', requiresLab: false },
  { id: '3', name: '物理', shortName: 'PHY', color: '#06B6D4', requiresLab: true },
  { id: '4', name: '化学', shortName: 'CHEM', color: '#10B981', requiresLab: true },
  { id: '5', name: '生物', shortName: 'BIO', color: '#F59E0B', requiresLab: false },
  { id: '6', name: '历史', shortName: 'HIST', color: '#EF4444', requiresLab: false },
  { id: '7', name: '地理', shortName: 'GEO', color: '#8B5CF6', requiresLab: false },
  { id: '8', name: '体育', shortName: 'PE', color: '#14B8A6', requiresLab: false },
  { id: '9', name: '音乐', shortName: 'MUS', color: '#F472B6', requiresLab: false },
  { id: '10', name: '美术', shortName: 'ART', color: '#A78BFA', requiresLab: false },
  { id: '11', name: '计算机', shortName: 'CS', color: '#3B82F6', requiresLab: true },
  { id: '12', name: '商科', shortName: 'BUS', color: '#F97316', requiresLab: false },
]

export const SUBJECT_NAMES = DEFAULT_SUBJECTS.map(s => s.name)
