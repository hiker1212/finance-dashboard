import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <nav className="bg-zinc-800 border-b border-zinc-700 px-6 py-4 flex items-center gap-8 sticky top-0 z-10">
        <span className="font-bold text-zinc-100 text-lg tracking-tight">💰 Finance</span>
        <div className="flex gap-6">
          {[
            { to: '/', label: 'Dashboard' },
            { to: '/transactions', label: 'Transactions' },
            { to: '/budgets', label: 'Budgets' },
            { to: '/analytics', label: 'Analytics' },
            { to: '/chat', label: 'Ask AI' },
            { to: '/batch', label: 'Batch' },
            { to: '/import', label: 'Import' },
            { to: '/usage', label: 'Usage' },
            { to: '/analysis', label: 'Analysis' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'text-indigo-400 font-medium text-sm'
                  : 'text-zinc-400 hover:text-zinc-100 text-sm transition-colors'
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
