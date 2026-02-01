'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-onsite-bg flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-onsite-dark rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-onsite-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div>
          <span className="font-bold text-onsite-text">OnSite</span>
          <span className="text-onsite-accent text-xs block">CLUB</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-500 mb-6">
          We encountered an unexpected error. Please try again.
        </p>

        {/* Message Box */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-gray-600 text-sm">
            If this problem persists, please contact us with details about what you were trying to do. We&apos;ll investigate and get back to you shortly.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="block w-full bg-onsite-accent hover:bg-onsite-accent/90 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Try Again
          </button>
          <a
            href="mailto:dev@onsiteclub.ca?subject=Auth%20Hub%20Error%20Report"
            className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold transition-colors"
          >
            Contact Support
          </a>
          <p className="text-gray-400 text-sm">
            <a href="mailto:dev@onsiteclub.ca" className="text-onsite-accent hover:underline">
              dev@onsiteclub.ca
            </a>
          </p>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-400">
              or
            </span>
          </div>
        </div>

        {/* Return hint */}
        <p className="text-gray-500 text-sm">
          You can close this window and return to the app.
        </p>
      </div>

      {/* Footer */}
      <p className="text-gray-400 text-sm mt-8">
        © 2026 OnSite Club. All rights reserved.
      </p>
    </div>
  );
}
