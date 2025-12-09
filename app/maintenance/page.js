import { Settings } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-blue-600" />
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
