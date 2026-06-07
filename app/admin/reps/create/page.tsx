'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateRepPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password) {
      setError('All fields are required.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/reps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone: phone.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create rep')
      setSuccess(`${firstName} ${lastName} has been added successfully.`)
      setFirstName('')
      setLastName('')
      setPhone('')
      setPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-[#2563eb] hover:underline text-sm font-medium">
            ← Admin Overview
          </Link>
          <h1 className="text-2xl font-bold text-[#111111]">Add Sales Rep</h1>
        </div>

        {success && (
          <div className="bg-[#dcfce7] border border-green-200 rounded-2xl p-5 mb-6">
            <p className="text-[#166534] font-semibold">{success}</p>
            <p className="text-[#166534] text-sm mt-1">
              The rep can now log in with their phone number and password.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-[#fee2e2] border border-red-200 rounded-2xl p-5 mb-6">
            <p className="text-[#991b1b] font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#111111]">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                autoComplete="given-name"
                className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-[#111111] bg-[#f5f5f5] placeholder:text-[#6b7280] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#111111]">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                autoComplete="family-name"
                className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-[#111111] bg-[#f5f5f5] placeholder:text-[#6b7280] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors text-base"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#111111]">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              autoComplete="tel"
              className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-[#111111] bg-[#f5f5f5] placeholder:text-[#6b7280] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors text-base"
            />
            <p className="text-xs text-[#6b7280]">This is the rep&apos;s login identifier.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#111111]">
              Initial Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a strong password"
                autoComplete="new-password"
                className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 pr-16 text-[#111111] bg-[#f5f5f5] placeholder:text-[#6b7280] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#111111] text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-[#6b7280]">Share this with the rep securely.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#2563eb] text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Creating…' : 'Create Rep Account'}
            </button>
            <Link
              href="/admin"
              className="px-6 py-3.5 border border-[#e5e5e5] rounded-xl text-[#111111] font-medium hover:bg-[#f5f5f5] transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
