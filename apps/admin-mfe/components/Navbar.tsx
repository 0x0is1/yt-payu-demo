'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Link2, ListOrdered, Radio, Settings, LogOut, LogIn, User } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useWebSocketContext();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="border border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="h-8 w-8 rounded bg-gold-600 text-white font-bold flex items-center justify-center text-base">
              P
            </span>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              PayU Admin
            </span>
          </Link>

          <nav className="flex space-x-1.5">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                pathname === '/'
                  ? 'bg-amber-100 text-gold-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Link2 className="h-4 w-4" />
              <span>Link Generator</span>
            </Link>

            <Link
              href="/orders"
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                pathname === '/orders'
                  ? 'bg-amber-100 text-gold-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ListOrdered className="h-4 w-4" />
              <span>Requests</span>
            </Link>

            <Link
              href="/settings"
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                pathname === '/settings'
                  ? 'bg-amber-100 text-gold-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Radio
              className={`h-3.5 w-3.5 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`}
            />
            <Badge variant={isConnected ? 'success' : 'slate'}>
              {isConnected ? 'Live' : 'Syncing'}
            </Badge>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center space-x-2 pl-2">
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded flex items-center space-x-1">
                <User className="h-3 w-3 text-slate-500" />
                <span>{user?.email}</span>
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1 px-2 py-1 rounded hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs text-gold-700 hover:text-gold-800 font-semibold flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
