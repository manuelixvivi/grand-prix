import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Delete the admin session cookie
  response.cookies.delete('cgp_admin_session')

  return response
}
