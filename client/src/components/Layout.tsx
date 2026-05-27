import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-8 sticky top-0 z-10">
        <span className="font-bold text-gray-900 text-lg tracking-tight">💰 Finance</span>
        <div className="flex gap-6">
          {[
            { to: '/', label: 'Dashboard' },
            { to: '/transactions', label: 'Transactions' },
            { to: '/budgets', label: 'Budgets' },
            { to: '/analytics', label: 'Analytics' },
            { to: '/chat', label: 'Ask AI' },
            { to: '/batch', label: 'Batch' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'text-indigo-600 font-medium text-sm'
                  : 'text-gray-500 hover:text-gray-900 text-sm transition-colors'
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
