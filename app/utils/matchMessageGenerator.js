export const generateMatchMessage = (matchesCount) => {
  if (matchesCount === 0) return null;

  const verb = matchesCount === 1 ? "" : "have";
  const matchText = matchesCount === 1 ? "a match" : `${matchesCount} matches`;
  const pronoun = matchesCount === 1 ? "it's" : "they're";

  return `Based on your search, I ${verb} found ${matchText}.
Click on the "find matches" button to see if ${pronoun} relevant. Let me know if ${pronoun} good, I'll keep looking out for more in the meantime. Cheers!`;
};
