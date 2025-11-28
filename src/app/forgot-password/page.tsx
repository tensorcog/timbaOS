"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            if (response.ok) {
                setSubmitted(true)
            } else {
                const data = await response.json()
                setError(data.error || "Failed to request password reset")
            }
        } catch (err) {
            setError("An error occurred. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Check Your Email
                        </h1>
                        <p className="mt-4 text-muted-foreground">
                            If an account exists with that email, you will receive a password reset link shortly.
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            The link will expire in 1 hour. Be sure to check your spam folder if you don't see it.
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-8 shadow-lg">
                        <div className="flex justify-center mb-6">
                            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>

                        <p className="text-center text-sm text-muted-foreground mb-6">
                            Didn't receive an email?
                        </p>

                        <button
                            onClick={() => setSubmitted(false)}
                            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                        >
                            Try Again
                        </button>
                    </div>

                    <div className="text-center">
                        <Link href="/login" className="text-sm text-primary hover:underline">
                            ← Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Forgot Password
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Enter your email address and we'll send you a link to reset your password
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-8 shadow-lg space-y-6">
                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            className="w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="your@email.com"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-semibold text-white shadow hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <div className="text-center">
                    <Link href="/login" className="text-sm text-primary hover:underline">
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
