"use client";
import { useRouter } from "next/navigation";

export default function SelectChatType({
  servicesProvided,
  selectedType,
  selectChatType,
  isCreating,
  creatingForServiceKey = null,
  enableCommunityOnboarding = false,
  communityName = "",
  enableQuiz = false,
  quizName = "",
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center px-4 h-full min-h-screen">
      <div className="flex flex-col gap-3 w-full max-w-md">
        <div className="px-4">
            {servicesProvided.length > 0 &&
              servicesProvided.map((item, index) => {
                const isLastService = index === servicesProvided.length - 1;
                const hasMoreItems = enableCommunityOnboarding || enableQuiz;
                const shouldShowLine = !(isLastService && !hasMoreItems);

                return (
                  <div
                    key={item._key || index}
                    className="flex flex-col justify-center items-center"
                  >
                    <button
                      onClick={() => {
                        !isCreating &&
                          selectChatType(
                            item.name,
                            item.initialMessage,
                            false,
                            item.title,
                            item._key
                          );
                      }}
                      className="font-akshar uppercase text-lg flex items-center justify-center w-full"
                      disabled={isCreating}
                    >
                      {isCreating &&
                        (creatingForServiceKey != null
                          ? creatingForServiceKey === item._key
                          : selectedType === item.name) ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="inline-block h-6 w-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin"></span>
                          <span className="font-akshar uppercase text-lg">
                            Starting…
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="font-akshar uppercase text-l font-light">
                            {item.title || item.name}
                          </span>
                        </div>
                      )}
                    </button>
                    {shouldShowLine && (
                      <div className="h-[0.5px] w-[40px] mx-auto bg-slate-400 my-4"></div>
                    )}
                  </div>
                );
              })}

            {/* Features Section - at the bottom */}
            {(enableCommunityOnboarding || enableQuiz) && (
              <>
                {enableCommunityOnboarding && (
                  <div className="flex flex-col justify-center items-center">
                    <button
                      onClick={() => router.push("/community")}
                      className="flex items-center justify-center w-full"
                      disabled={isCreating}
                    >
                      <div className="flex items-center justify-center">
                        <span className="font-akshar uppercase text-lg font-light">
                          {communityName || "Community"}
                        </span>
                      </div>
                    </button>
                    {enableQuiz && (
                      <div className="h-[0.5px] w-[40px] mx-auto bg-slate-400 my-4"></div>
                    )}
                  </div>
                )}
                {enableQuiz && (
                  <div className="flex flex-col justify-center items-center">
                    <button
                      onClick={() => router.push("/quiz")}
                      className="font-akshar uppercase text-lg flex items-center justify-center w-full"
                      disabled={isCreating}
                    >
                      <div className="flex items-center justify-center">
                        <span className="font-akshar uppercase text-lg font-light">
                          {quizName || "Take quiz/survey"}
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
}
