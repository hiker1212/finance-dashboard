import type { MonthlySummary, Transaction } from '../types'

export async function exportSummaryToPdf(
  summary: MonthlySummary,
  transactions: Transaction[],
) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const net = summary.total_income - summary.total_expenses

  // ── Title ──────────────────────────────────────────────────
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Finance Summary', 14, 20)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(summary.month, 14, 28)
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 35)
  doc.setTextColor(0)

  // ── KPI row ────────────────────────────────────────────────
  const kpis = [
    { label: 'Income', value: summary.total_income, color: [16, 185, 129] as [number, number, number] },
    { label: 'Expenses', value: summary.total_expenses, color: [239, 68, 68] as [number, number, number] },
    { label: 'Net Savings', value: net, color: (net >= 0 ? [16, 185, 129] : [239, 68, 68]) as [number, number, number] },
  ]

  const boxW = 58, boxH = 20, startX = 14, startY = 44
  kpis.forEach(({ label, value, color }, i) => {
    const x = startX + i * (boxW + 3)
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(x, startY, boxW, boxH, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text(label.toUpperCase(), x + 4, startY + 7)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.text(`$${value.toFixed(2)}`, x + 4, startY + 16)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)
  })

  // ── Category spending table ────────────────────────────────
  const catRows = summary.by_category
    .filter(c => c.spent > 0 || c.monthly_limit != null)
    .map(c => {
      const pct = c.monthly_limit ? Math.round((c.spent / c.monthly_limit) * 100) : null
      return [
        c.name,
        `$${c.spent.toFixed(2)}`,
        c.monthly_limit ? `$${c.monthly_limit.toFixed(2)}` : '—',
        pct != null ? `${pct}%` : '—',
      ]
    })

  if (catRows.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Spending by Category', 14, startY + boxH + 12)

    autoTable(doc, {
      startY: startY + boxH + 16,
      head: [['Category', 'Spent', 'Budget', '% Used']],
      body: catRows,
      headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Transactions table ─────────────────────────────────────
  const txRows = transactions.map(t => [
    t.date,
    t.type.charAt(0).toUpperCase() + t.type.slice(1),
    t.description,
    t.category_name ?? '—',
    `${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}`,
  ])

  if (txRows.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? startY + boxH + 16

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Transactions', 14, finalY + 12)

    autoTable(doc, {
      startY: finalY + 16,
      head: [['Date', 'Type', 'Description', 'Category', 'Amount']],
      body: txRows,
      headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  doc.save(`finance-summary-${summary.month}.pdf`)
}
