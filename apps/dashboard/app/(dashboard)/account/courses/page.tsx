import { BookOpen, Clock, Award, Play } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Courses & Training',
}

export default function CoursesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back + Header */}
      <div>
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Courses & Training</h1>
        <p className="text-gray-600 mt-1">
          Professional development for construction workers
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-8 text-white text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Coming Soon</h2>
        <p className="text-orange-100 text-lg max-w-md mx-auto">
          We're building a comprehensive training platform for construction professionals.
        </p>
      </div>

      {/* What to Expect */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">What to Expect</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeaturePreview
            icon={Play}
            title="Video Courses"
            description="Step-by-step video tutorials from industry experts"
          />
          <FeaturePreview
            icon={Award}
            title="Certifications"
            description="Earn certificates to boost your career"
          />
          <FeaturePreview
            icon={Clock}
            title="Learn Anytime"
            description="Access courses on your schedule, online or offline"
          />
        </div>
      </div>

      {/* Course Categories Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Planned Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            'Safety Training',
            'Tools & Equipment',
            'Building Codes',
            'Project Management',
            'Electrical Basics',
            'Plumbing 101',
            'Carpentry Skills',
            'Business Skills',
          ].map((category) => (
            <div
              key={category}
              className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center"
            >
              <p className="text-gray-600 font-medium">{category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notify Me */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Want to be notified when courses launch?
        </h3>
        <p className="text-gray-500 mb-4">
          We'll send you an email when the training platform is ready.
        </p>
        <button
          disabled
          className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl opacity-50 cursor-not-allowed"
        >
          Notify Me (Coming Soon)
        </button>
      </div>
    </div>
  )
}

function FeaturePreview({
  icon: Icon,
  title,
  description,
}: {
  icon: any
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-orange-600" />
      </div>
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )
}
