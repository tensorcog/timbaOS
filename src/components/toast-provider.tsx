"use client"

import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: 'hsl(var(--green-500))',
            secondary: 'hsl(var(--card))',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: 'hsl(var(--destructive))',
            secondary: 'hsl(var(--card))',
          },
        },
        loading: {
          iconTheme: {
            primary: 'hsl(var(--blue-500))',
            secondary: 'hsl(var(--card))',
          },
        },
      }}
    />
  )
}
