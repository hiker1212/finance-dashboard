import type { Transaction } from '../types'

export async function exportTransactionsToExcel(transactions: Transaction[], month: string) {
  const XLSX = await import('xlsx')

  const rows = transactions.map(t => ({
    Date: t.date,
    Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
    Description: t.description,
    Category: t.category_name ?? '',
    Amount: t.type === 'income' ? t.amount : -t.amount,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 32 }, { wch: 18 }, { wch: 12 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
  XLSX.writeFile(wb, `transactions-${month}.xlsx`)
}
