import { redirect } from 'next/navigation'

// Checklist is a public, login-free tool. Everyone — from any carpenter
// on the planet — lands on /self, fills a form, runs the inspection, and
// downloads a PDF. Root just forwards to that flow.
export default function RootPage() {
  redirect('/self')
}
