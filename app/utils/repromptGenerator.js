export const generateReprompt = (originalReply) => {
  return `FORMATTING TASK: The assistant's last response has the correct content but wrong format. 

Please reformat it as:
${originalReply}
////
[Create a summary of the conversation based on all the context above]
////
[Create a short title (max 20 chars)]
////
[true or false based on whether all required data points have been collected]

Do NOT change the reply content ("${originalReply}") - keep it exactly as is. Only add the missing format parts based on the conversation context.`;
};
