"use client";

import React from "react";
import Footer from "../components/Footer";

export default function AIWidgetsPage() {
    return (
        <div className="min-h-screen bg-white text-[#2D4752]">

            {/* ── CUSTOM ANIMATION STYLES ── */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
        .moving-gradient {
          background: linear-gradient(to right, #00B5BD 20%, #80FFFF 50%, #00B5BD 80%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shine 3s linear infinite;
        }
      `}} />

            {/* ── HERO & FEATURES SECTION ── */}
            <div className="flex flex-col items-center justify-center min-h-[85vh] lg:min-h-[calc(100vh-80px)] pt-[60px] pb-16 px-4">

                {/* Logo */}
                <div className="mb-4 md:mb-6">
                    <img src="/kavisha-logo.png" width={130} height={130} alt="Kavisha" className="w-[100px] md:w-[130px]" />
                </div>

                {/* Title */}
                <div className="text-center mb-4 md:mb-6">
                    <h1 className="text-4xl md:text-6xl lg:text-[75px] font-normal leading-[1.1] mb-4">
                        An <span className="text-[#00B5BD]">AI Agent</span> for your<br className="hidden md:block" /> website
                    </h1>

                    <p className="max-w-3xl mx-auto text-lg md:text-xl font-light text-[#4A6670] leading-relaxed px-4">
                        Using Kavisha, you can create a custom AI Widget that talks to your website's
                        casual visitors, and converts them into customers and deep admirers.
                    </p>
                </div>

                {/* Feature Icons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 max-w-5xl mx-auto mt-8">
                    {[
                        { img: "/Increased engagement photo.png", text: "INCREASED ENGAGEMENT" },
                        { img: "/Meaningful conversations photo.png", text: "MEANINGFUL CONVERSATIONS" },
                        { img: "/Favorable actions photo.png", text: "FAVORABLE ACTIONS" },
                        { img: "/Seamless integration photo.png", text: "SEAMLESS INTEGRATION" },
                    ].map((feature, i) => (
                        <div key={i} className="flex flex-col items-center text-center">
                            <div className="mb-4 flex items-center justify-center">
                                <img src={feature.img} alt="" className="w-20 h-20 md:w-24 md:h-24 object-contain" />
                            </div>
                            <p className="text-xs md:text-sm font-semibold tracking-wider text-[#3D5B66] max-w-[150px] leading-relaxed">
                                {feature.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── STEP-BY-STEP PROCESS ── */}
            <div className="max-w-6xl mx-auto px-6 py-24 space-y-32">
                {/* Step 1 */}
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 order-2 md:order-1 text-center md:text-left">
                        <h2 className="text-[#00B5BD] text-2xl font-semibold mb-4">Step 1</h2>
                        <p className="text-xl md:text-2xl font-light leading-relaxed">
                            Train your Avataar with all the information on your website (No limits!).
                            Tweak the personality of your Avataar so it sounds just like you.
                        </p>
                    </div>
                    <div className="flex-1 order-1 md:order-2 flex justify-center">
                        <img src="/Step 1 photo.png" alt="Training AI" className="w-full max-w-md h-auto" />
                    </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 flex justify-center">
                        <img src="/Step 2 photo.png" alt="Code Snippet" className="w-full max-w-[280px] md:max-w-[320px] h-auto" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-[#00B5BD] text-2xl font-semibold mb-4">Step 2</h2>
                        <p className="text-xl md:text-2xl font-light leading-relaxed">
                            Integrate the code snippet of the widget to your website.
                        </p>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 order-2 md:order-1 text-center md:text-left">
                        <h2 className="text-[#00B5BD] text-2xl font-semibold mb-4">Step 3</h2>
                        <p className="text-xl md:text-2xl font-light leading-relaxed">
                            See the magic happen and enjoy advanced analytics.
                        </p>
                    </div>
                    <div className="flex-1 order-1 md:order-2 flex justify-center">
                        <img src="/Step 3 photo.png" alt="Analytics" className="w-full max-w-md h-auto" />
                    </div>
                </div>
            </div>

            {/* ── STATISTICS SECTION ── */}
            <div className="bg-white py-20 px-4">
                <div className="max-w-5xl mx-auto bg-white rounded-[35px] border border-gray-200 shadow-sm py-14 px-4 flex flex-col md:flex-row items-center justify-between">
                    <div className="flex-1 flex flex-col items-center text-center">
                        <p className="text-6xl md:text-7xl lg:text-8xl font-normal mb-3">
                            <span className="text-[#00B5BD]">12</span>
                            <span className="text-black">x</span>
                        </p>
                        <p className="text-[#1A1A1A] uppercase tracking-[0.2em] text-xs md:text-sm font-semibold">User Engagement</p>
                    </div>
                    <div className="hidden md:block w-[1px] h-24 bg-gray-200"></div>
                    <div className="flex-1 flex flex-col items-center text-center py-8 md:py-0">
                        <p className="text-6xl md:text-7xl lg:text-8xl font-normal mb-3">
                            <span className="text-[#00B5BD]">4</span>
                            <span className="text-black">x</span>
                        </p>
                        <p className="text-[#1A1A1A] uppercase tracking-[0.2em] text-xs md:text-sm font-semibold">Call-to-action</p>
                    </div>
                    <div className="hidden md:block w-[1px] h-24 bg-gray-200"></div>
                    <div className="flex-1 flex flex-col items-center text-center">
                        <p className="text-6xl md:text-7xl lg:text-8xl font-normal mb-3">
                            <span className="text-[#00B5BD]">24</span>
                            <span className="text-black ml-2">hr</span>
                        </p>
                        <p className="text-[#1A1A1A] uppercase tracking-[0.2em] text-xs md:text-sm font-semibold">Integration</p>
                    </div>
                </div>
            </div>

            {/* ── FINAL CTA SECTION ── */}
            <div className="bg-[#264653] text-white py-20 px-4 text-center">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-normal mb-6 tracking-wide leading-tight">
                    Get a custom <span className="moving-gradient font-medium">AI Agent</span> for your website
                </h2>
                <p className="text-xl md:text-2xl font-light opacity-90 mb-12">
                    Subscriptions start at ₹999 (~$10) per month
                </p>
                <button className="px-12 py-3 rounded-full border border-white/60 text-white text-lg md:text-xl hover:bg-white hover:text-[#264653] transition-all duration-300 font-medium">
                    Contact sales
                </button>
            </div>

            {/* ── TAGLINE LOGO SECTION ── */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-white to-[#E4EEF2] px-4 py-8 md:py-14 border-t border-border/40">
                <div className="flex flex-col items-center justify-center pb-4 pt-2">
                    <img src="/kavisha-logo.png" width={120} height={120} alt="Kavisha" className="w-[120px] md:w-[150px]" />
                </div>
                <p className="max-w-3xl text-center text-sm font-light tracking-wide text-[#4A6670] md:text-xl">
                    With Kavisha, influencers and brands can interact with their fans,
                    create opportunities for them, and make them happy. Like never before.
                </p>
            </div>

            {/* ── FOOTER ── */}
            <div className="bg-white w-full">
                <Footer />
            </div>
        </div>
    );
}