const thinkingUtterances = [
    "Let me think...",
    "Just a moment...",
    "One second...",
    "Hold on a sec...",
    "Just a sec...",
    "Let's see...",
    "Bear with me...",
    "Looking into that for you...",
    "Checking my sources...",
    "Let me see...",
    "Working on it...",
    "Let me consult my knowledge base...",
    "Just pulling up the data...",
    "Let me look into that...",
    "Hmmmm...",
    "Let me check on that...",
    "Let me look that up for you...",
    "Let me check my notes...",
];

/**
 * Retrieve a random thinking utterance for immediate feedback.
 * @returns {string} A randomly-selected thinking utterance.
 */
function getRandomThinkingUtterance() {
    const randomIndex = Math.floor(Math.random() * thinkingUtterances.length);
    return thinkingUtterances[randomIndex];
}

module.exports = {
    utterances: thinkingUtterances,
    getRandomThinkingUtterance: getRandomThinkingUtterance
};