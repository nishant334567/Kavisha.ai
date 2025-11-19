export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          We're Building Something Amazing
        </h1>

        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          We're currently enhancing our platform with exciting new features and
          optimizing our backend infrastructure to deliver an even better
          experience.
        </p>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-8 border border-gray-100">
          <p className="text-gray-700 font-medium mb-4">
            Our team is working hard to bring you:
          </p>
          <ul className="text-left space-y-3 text-gray-600 max-w-md mx-auto">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 mt-1">✓</span>
              <span>Advanced AI capabilities and improved performance</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 mt-1">✓</span>
              <span>Enhanced security and reliability improvements</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 mt-1">✓</span>
              <span>New features that will transform your experience</span>
            </li>
          </ul>
        </div>

        <p className="text-gray-500 mb-8 text-lg">
          We'll be back online shortly. Thank you for your patience!
        </p>

        <div className="pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            For urgent inquiries, contact us at{" "}
            <a
              href="mailto:hello@kavisha.ai"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              hello@kavisha.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
