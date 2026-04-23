import Footer from "../components/Footer";

/** Static assets for this route only (`public/widget-intro/`). */
const WI = "/widget-intro";

const FEATURES = [
    {
        id: "engagement",
        img: `${WI}/engagement.png`,
        text: "INCREASED ENGAGEMENT",
        alt: "Increased engagement",
    },
    {
        id: "conversations",
        img: `${WI}/conversations.png`,
        text: "MEANINGFUL CONVERSATIONS",
        alt: "Meaningful conversations",
    },
    {
        id: "actions",
        img: `${WI}/actions.png`,
        text: "FAVORABLE ACTIONS",
        alt: "Favorable actions",
    },
    {
        id: "integration",
        img: `${WI}/integration.png`,
        text: "SEAMLESS INTEGRATION",
        alt: "Seamless integration",
    },
];

/** Use encodeURIComponent (not URLSearchParams) so spaces are %20, not + — mail clients often show + literally. */
const CONTACT_SALES_MAILTO = (() => {
    const subject = encodeURIComponent("Kavisha AI Widget — sales inquiry");
    const body = encodeURIComponent(
        "Hey I'm interested in getting the Kavisha AI Widget on my website. Tell me how I can go ahead!",
    );
    return `mailto:hello@kavisha.ai?subject=${subject}&body=${body}`;
})();

export default function WidgetIntroPage() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="flex min-h-[85vh] flex-col items-center justify-center px-4 pb-16 pt-[60px] lg:min-h-[calc(100vh-80px)]">
                <div className="mb-4 md:mb-6">
                    <img
                        src="/kavisha-logo.png"
                        width={130}
                        height={130}
                        alt="Kavisha"
                        className="h-auto w-[100px] md:w-[130px]"
                    />
                </div>

                <div className="mb-4 text-center md:mb-6">
                    <h1 className="mb-4 text-4xl font-normal leading-[1.1] md:text-6xl lg:text-[75px]">
                        An <span className="text-[#00B5BD]">AI Agent</span> for your
                        <br className="hidden md:block" /> website
                    </h1>
                    <p className="mx-auto max-w-3xl px-4 text-lg font-light leading-relaxed text-muted md:text-xl">
                        Using Kavisha, you can create a custom AI Widget that talks to your
                        website&apos;s casual visitors, and converts them into customers and
                        deep admirers.
                    </p>
                </div>

                <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4 md:gap-12">
                    {FEATURES.map((feature) => (
                        <div
                            key={feature.id}
                            className="flex flex-col items-center text-center"
                        >
                            <div className="mb-4 flex items-center justify-center">
                                <img
                                    src={feature.img}
                                    alt={feature.alt}
                                    className="h-20 w-20 object-contain md:h-24 md:w-24"
                                />
                            </div>
                            <p className="max-w-[150px] text-xs font-semibold leading-relaxed tracking-wider text-foreground/90 md:text-sm">
                                {feature.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mx-auto max-w-6xl space-y-32 px-6 py-24">
                <div className="flex flex-col items-center gap-12 md:flex-row">
                    <div className="order-2 flex-1 text-center md:order-1 md:text-left">
                        <h2 className="mb-4 text-2xl font-semibold text-[#00B5BD]">Step 1</h2>
                        <p className="text-xl font-light leading-relaxed md:text-2xl">
                            Train your Avataar with all the information on your website (No
                            limits!). Tweak the personality of your Avataar so it sounds just
                            like you.
                        </p>
                    </div>
                    <div className="order-1 flex flex-1 justify-center md:order-2">
                        <img
                            src={`${WI}/step-1.png`}
                            alt="Training AI"
                            className="h-auto w-full max-w-md"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-12 md:flex-row">
                    <div className="flex flex-1 justify-center">
                        <img
                            src={`${WI}/step-2.png`}
                            alt="Widget code snippet"
                            className="h-auto w-full max-w-[280px] md:max-w-[320px]"
                        />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="mb-4 text-2xl font-semibold text-[#00B5BD]">Step 2</h2>
                        <p className="text-xl font-light leading-relaxed md:text-2xl">
                            Integrate the code snippet of the widget to your website.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-12 md:flex-row">
                    <div className="order-2 flex-1 text-center md:order-1 md:text-left">
                        <h2 className="mb-4 text-2xl font-semibold text-[#00B5BD]">Step 3</h2>
                        <p className="text-xl font-light leading-relaxed md:text-2xl">
                            See the magic happen and enjoy advanced analytics.
                        </p>
                    </div>
                    <div className="order-1 flex flex-1 justify-center md:order-2">
                        <img
                            src={`${WI}/step-3.png`}
                            alt="Analytics"
                            className="h-auto w-full max-w-md"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-background px-4 py-20">
                <div className="mx-auto flex max-w-5xl flex-col items-center justify-between rounded-[35px] border border-border bg-card px-4 py-14 shadow-sm md:flex-row">
                    <div className="flex flex-1 flex-col items-center text-center">
                        <p className="mb-3 text-6xl font-normal md:text-7xl lg:text-8xl">
                            <span className="text-[#00B5BD]">12</span>
                            <span className="text-foreground">x</span>
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground md:text-sm">
                            User Engagement
                        </p>
                    </div>
                    <div className="hidden h-24 w-px bg-border md:block" />
                    <div className="flex flex-1 flex-col items-center py-8 text-center md:py-0">
                        <p className="mb-3 text-6xl font-normal md:text-7xl lg:text-8xl">
                            <span className="text-[#00B5BD]">4</span>
                            <span className="text-foreground">x</span>
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground md:text-sm">
                            Call-to-action
                        </p>
                    </div>
                    <div className="hidden h-24 w-px bg-border md:block" />
                    <div className="flex flex-1 flex-col items-center text-center">
                        <p className="mb-3 text-6xl font-normal md:text-7xl lg:text-8xl">
                            <span className="text-[#00B5BD]">24</span>
                            <span className="ml-2 text-foreground">hr</span>
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground md:text-sm">
                            Integration
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-highlight px-4 py-20 text-center text-white">
                <h2 className="mb-6 text-3xl font-normal leading-tight tracking-wide md:text-5xl lg:text-6xl">
                    Get a custom{" "}
                    <span className="widget-intro-moving-gradient font-medium">
                        AI Agent
                    </span>{" "}
                    for your website
                </h2>
                <p className="mb-12 text-xl font-light opacity-90 md:text-2xl">
                    Subscriptions start at ₹999 (~$10) per month
                </p>
                <a
                    href={CONTACT_SALES_MAILTO}
                    className="inline-block rounded-full border border-white/60 px-12 py-3 text-lg font-medium transition-all duration-300 hover:bg-background hover:text-highlight md:text-xl"
                >
                    Contact sales
                </a>
            </div>

            <div className="flex flex-col items-center justify-center border-t border-border/40 bg-gradient-to-b from-background to-muted-bg px-4 py-8 md:py-14">
                <div className="flex flex-col items-center justify-center pb-4 pt-2">
                    <img
                        src="/kavisha-logo.png"
                        width={120}
                        height={120}
                        alt="Kavisha"
                        className="h-auto w-[120px] md:w-[150px]"
                    />
                </div>
                <p className="max-w-3xl text-center text-sm font-light tracking-wide text-muted md:text-xl">
                    With Kavisha, influencers and brands can interact with their fans,
                    create opportunities for them, and make them happy. Like never before.
                </p>
            </div>

            <div className="w-full bg-background">
                <Footer />
            </div>
        </main>
    );
}
