import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export function Layout() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-800">
      <nav className="bg-white border-b border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 px-6 py-4 flex items-center gap-8 sticky top-0 z-10">
        <span className="font-bold text-gray-900 dark:text-zinc-100 text-lg tracking-tight">💰 Finance</span>
        <div className="flex gap-6 flex-1">
          {[
            { to: '/', label: 'Dashboard' },
            { to: '/transactions', label: 'Transactions' },
            { to: '/budgets', label: 'Budgets' },
            { to: '/analytics', label: 'Analytics' },
            { to: '/ai', label: 'AI' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-medium text-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-sm transition-colors'
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <button
          onClick={toggleTheme}
          className="text-xs text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 border border-gray-200 dark:border-zinc-600 rounded px-2.5 py-1 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
