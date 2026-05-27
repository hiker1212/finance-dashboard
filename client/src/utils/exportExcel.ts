import type { Transaction } from '../types'

export async function exportTransactionsToExcel(transactions: Transaction[], month: string) {
  const ExcelJS = (await import('exceljs')).default

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Transactions')

  sheet.columns = [
    { header: 'Date',        key: 'date',        width: 14 },
    { header: 'Type',        key: 'type',        width: 12 },
    { header: 'Description', key: 'description', width: 34 },
    { header: 'Category',    key: 'category',    width: 20 },
    { header: 'Amount',      key: 'amount',      width: 14 },
  ]

  for (const t of transactions) {
    sheet.addRow({
      date: t.date,
      type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
      description: t.description,
      category: t.category_name ?? '',
      amount: t.type === 'income' ? t.amount : -t.amount,
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${month}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
