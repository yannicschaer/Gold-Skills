import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { SkillRating } from '@/types/database'
import type { SkillWithCategory, SanitySkillCategory } from '@/types/sanity'

function formatDate() {
  return new Date().toISOString().slice(0, 10)
}

function escapeCsv(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(['﻿' + content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface PersonSkillRow {
  category: string
  skill: string
  current: number
  target: number
  delta: number
}

function buildPersonRows(
  categories: SanitySkillCategory[],
  skills: SkillWithCategory[],
  ratings: SkillRating[],
): PersonSkillRow[] {
  const rows: PersonSkillRow[] = []
  for (const cat of categories) {
    const catSkills = skills.filter((s) => s.categorySlug === cat.slug)
    for (const skill of catSkills) {
      const r = ratings.find((r) => r.skill_id === skill._id)
      const current = r?.current_level ?? 0
      const target = r?.target_level ?? 0
      rows.push({
        category: cat.title,
        skill: skill.title,
        current,
        target,
        delta: target - current,
      })
    }
  }
  return rows
}

// --- Person Export (MySkills / MemberSkills) ---

export function exportPersonCsv(
  personName: string,
  categories: SanitySkillCategory[],
  skills: SkillWithCategory[],
  ratings: SkillRating[],
) {
  const rows = buildPersonRows(categories, skills, ratings)
  const header = ['Kategorie', 'Skill', 'Ist-Level', 'Soll-Level', 'Delta'].map(escapeCsv).join(',')
  const csvRows = rows.map((r) =>
    [r.category, r.skill, r.current, r.target, r.delta].map(escapeCsv).join(','),
  )
  const csv = [header, ...csvRows].join('\n')
  downloadFile(csv, `skills_${personName.replace(/\s+/g, '_')}_${formatDate()}.csv`, 'text/csv')
}

export function exportPersonPdf(
  personName: string,
  categories: SanitySkillCategory[],
  skills: SkillWithCategory[],
  ratings: SkillRating[],
) {
  const doc = new jsPDF()
  doc.setFontSize(18)
  doc.text(`Skills – ${personName}`, 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Exportiert am ${formatDate()}`, 14, 27)
  doc.setTextColor(0)

  let startY = 35

  for (const cat of categories) {
    const catSkills = skills.filter((s) => s.categorySlug === cat.slug)
    if (catSkills.length === 0) continue

    const tableData = catSkills.map((skill) => {
      const r = ratings.find((r) => r.skill_id === skill._id)
      const current = r?.current_level ?? 0
      const target = r?.target_level ?? 0
      const delta = target - current
      return [skill.title, String(current), String(target), delta > 0 ? `+${delta}` : String(delta)]
    })

    autoTable(doc, {
      startY,
      head: [[cat.title, 'Ist', 'Soll', 'Delta']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 70, 70], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
      },
    })

    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  downloadBlob(doc.output('blob'), `skills_${personName.replace(/\s+/g, '_')}_${formatDate()}.pdf`)
}

// --- Team Matrix Export ---

interface TeamMember {
  id: string
  name: string
}

export function exportTeamCsv(
  members: TeamMember[],
  categories: SanitySkillCategory[],
  skills: SkillWithCategory[],
  teamRatings: SkillRating[],
) {
  const ratingMap = new Map<string, SkillRating>()
  for (const r of teamRatings) {
    ratingMap.set(`${r.user_id}:${r.skill_id}`, r)
  }

  const memberHeaders = members.flatMap((m) => [`${m.name} Ist`, `${m.name} Soll`])
  const header = ['Kategorie', 'Skill', ...memberHeaders, 'Ø Ist', 'Ø Soll', 'Ø Delta'].map(escapeCsv).join(',')

  const csvRows: string[] = []
  for (const cat of categories) {
    const catSkills = skills.filter((s) => s.categorySlug === cat.slug)
    for (const skill of catSkills) {
      const row: (string | number)[] = [cat.title, skill.title]
      let sumCurrent = 0
      let sumTarget = 0
      let count = 0
      for (const m of members) {
        const r = ratingMap.get(`${m.id}:${skill._id}`)
        const c = r?.current_level ?? 0
        const t = r?.target_level ?? 0
        row.push(c, t)
        if (r) {
          sumCurrent += c
          sumTarget += t
          count++
        }
      }
      const avgC = count > 0 ? (sumCurrent / count).toFixed(1) : '–'
      const avgT = count > 0 ? (sumTarget / count).toFixed(1) : '–'
      const avgD = count > 0 ? ((sumTarget - sumCurrent) / count).toFixed(1) : '–'
      row.push(avgC, avgT, avgD)
      csvRows.push(row.map(escapeCsv).join(','))
    }
  }

  const csv = [header, ...csvRows].join('\n')
  downloadFile(csv, `team_skills_matrix_${formatDate()}.csv`, 'text/csv')
}

export function exportTeamPdf(
  members: TeamMember[],
  categories: SanitySkillCategory[],
  skills: SkillWithCategory[],
  teamRatings: SkillRating[],
) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(18)
  doc.text('Team Skills Matrix', 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`${members.length} Mitglieder · Exportiert am ${formatDate()}`, 14, 27)
  doc.setTextColor(0)

  const ratingMap = new Map<string, SkillRating>()
  for (const r of teamRatings) {
    ratingMap.set(`${r.user_id}:${r.skill_id}`, r)
  }

  let startY = 35

  for (const cat of categories) {
    const catSkills = skills.filter((s) => s.categorySlug === cat.slug)
    if (catSkills.length === 0) continue

    const head = [cat.title, ...members.map((m) => m.name), 'Ø Ist', 'Ø Soll']

    const body = catSkills.map((skill) => {
      const row: string[] = [skill.title]
      let sumCurrent = 0
      let sumTarget = 0
      let count = 0
      for (const m of members) {
        const r = ratingMap.get(`${m.id}:${skill._id}`)
        const c = r?.current_level ?? 0
        const t = r?.target_level ?? 0
        row.push(`${c}/${t}`)
        if (r) {
          sumCurrent += c
          sumTarget += t
          count++
        }
      }
      row.push(count > 0 ? (sumCurrent / count).toFixed(1) : '–')
      row.push(count > 0 ? (sumTarget / count).toFixed(1) : '–')
      return row
    })

    autoTable(doc, {
      startY,
      head: [head],
      body,
      theme: 'grid',
      headStyles: { fillColor: [30, 70, 70], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 40 },
      },
    })

    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  downloadBlob(doc.output('blob'), `team_skills_matrix_${formatDate()}.pdf`)
}
