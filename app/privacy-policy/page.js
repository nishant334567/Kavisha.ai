"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Footer from "../components/Footer";

export default function PrivacyPolicy() {
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

                <h1 className="text-3xl font-medium mb-6">Privacy Policy</h1>

                <p className="mb-6 text-gray-600 font-normal">Last Updated: December 23, 2025</p>

                <p className="mb-6 font-normal">
                    At Kavisha.ai, we stand for human connections in the age of AI. To help you find the "perfect" person—whether for a job, a hire, or a friendship—we process certain information. This Privacy Policy explains how we collect, use, and protect your data when you interact with Kavisha and our digital avatars.
                </p>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">1. Information We Collect</h2>
                    <p className="mb-2 font-normal">To provide a personalized experience and facilitate deep connections, we collect the following:</p>
                    <ul className="list-disc list-inside mb-2 space-y-1 font-normal">
                        <li>Account Information: Name, email address, and professional background (for recruiters and job seekers).</li>
                        <li>Conversation Data: The text or voice inputs you provide during your "deep conversations" with Kavisha and other avatars.</li>
                        <li>Preference Data: Information about your goals (e.g., "looking for a software engineering role" or "searching for mentors in AI").</li>
                        <li>Technical Data: IP address, device type, and interaction logs to ensure the platform remains secure and functional.</li>
                    </ul>
                </section>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">2. How We Use Your Information</h2>
                    <p className="mb-2 font-normal">We use your data to power our mission of connection:</p>
                    <ul className="list-disc list-inside mb-2 space-y-1 font-normal">
                        <li>The "Perfect Match" Algorithm: We analyze your conversations to understand your personality, skills, and needs, matching you with the most compatible recruiters, candidates, or friends.</li>
                        <li>AI Improvement: Your interactions help train our models to be more empathetic, insightful, and helpful.</li>
                        <li>Service Delivery: To facilitate the creation and maintenance of digital avatars.</li>
                    </ul>
                </section>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">3. AI and Data Processing</h2>
                    <p className="mb-2 font-normal">Human-Centric AI: We use AI to bridge gaps between humans, not to replace them. Our processing is designed to extract "connection signals" from your conversations.</p>
                    <p className="mb-2 font-normal">Transparency: You will always be notified when you are interacting with an AI avatar rather than a human.</p>
                    <p className="font-normal">Model Training Opt-Out: You may choose to have your conversations excluded from our general AI training datasets through your account settings.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">4. Sharing and Disclosure</h2>
                    <p className="mb-2 font-normal">We do not sell your personal data to third-party advertisers. We only share data when:</p>
                    <ul className="list-disc list-inside mb-2 space-y-1 font-normal">
                        <li>Facilitating Connections: If you are a job seeker, relevant profile highlights may be shared with recruiters identified as a "perfect match."</li>
                        <li>Service Providers: We work with trusted cloud and AI infrastructure providers who adhere to strict data security standards.</li>
                        <li>Legal Necessity: If required by law to protect our users or comply with legal processes.</li>
                    </ul>
                </section>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">5. Your Rights and Control</h2>
                    <p className="mb-2 font-normal">In accordance with 2025 global privacy standards, you have the right to:</p>
                    <ul className="list-disc list-inside mb-2 space-y-1 font-normal">
                        <li>Access & Export: Request a copy of the data we hold about you.</li>
                        <li>Correction: Update inaccurate professional or personal details.</li>
                        <li>The "Right to be Forgotten": Request the deletion of your account and associated conversation history.</li>
                        <li>Automated Decision Review: If a match or recruitment decision is made solely by AI, you have the right to request a human review.</li>
                    </ul>
                </section>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">6. Data Security</h2>
                    <p className="font-normal">
                        We implement "Privacy by Design." This includes End-to-End Encryption for conversations and Anonymization of data used for internal research. While we strive for perfection, no system is 100% secure; we encourage you not to share sensitive credentials (like passwords) within the chat.
                    </p>
                </section>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">7. International Data Transfers</h2>
                    <p className="font-normal">
                        Kavisha.ai is a global platform. Your data may be processed in jurisdictions with different privacy laws than your own. We use Standard Contractual Clauses (SCCs) to ensure your data remains protected regardless of where it is stored.
                    </p>
                </section>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">8. Changes to this Policy</h2>
                    <p className="font-normal">
                        As AI technology evolves, so will our practices. We will notify you of any significant changes via email or a prominent notice on our platform.
                    </p>
                </section>

                <section className="mb-6">
                    <h2 className="text-2xl font-medium mb-3">Contact Us</h2>
                    <p className="font-normal">
                        For questions about your data or to exercise your rights: Email: <a href="mailto:privacy@kavisha.ai" className="text-blue-600 hover:underline">privacy@kavisha.ai</a>
                    </p>
                </section>
            </div>

            <Footer />
        </div>
    );
}
