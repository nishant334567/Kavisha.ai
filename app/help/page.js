"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Footer from "../components/Footer";

export default function Help() {
    const router = useRouter();

    return (
        <div>
            <div className="max-w-4xl mx-auto px-4 py-8 font-fredoka mt-8">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                </button>

                <p className="mb-6 font-normal">
                    Contact us at <a href="mailto:hello@kavisha.ai" className="text-blue-600 hover:underline font-medium">hello@kavisha.ai</a> for help.
                </p>
            </div>

            <Footer />
        </div>
    );
}
