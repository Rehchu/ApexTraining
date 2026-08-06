const parts1 = [
  "Let's crush it", "Time to shine", "Unleash your potential", "Push your limits", "Embrace the challenge",
  "Stay focused", "Keep grinding", "Rise and grind", "Make today count", "Step up your game",
  "Be relentless", "Stay hungry", "Go the extra mile", "Defy the odds", "Break your records",
  "Fuel your fire", "Chase your goals", "Commit to be fit", "Sweat is magic", "Train like a beast",
  "Be unstoppable", "Find your strength", "Conquer the day", "Own your journey", "Elevate your mindset"
];

const parts2 = [
  "today!", "right now!", "this week!", "and never look back!", "with everything you have!",
  "and make it happen!", "like never before!", "and show them what you're made of!", "for your future self!", "and enjoy the process!",
  "and trust the journey!", "one rep at a time!", "and celebrate small wins!", "with passion!", "and be proud!",
  "without excuses!", "because you can!", "and leave it all on the floor!", "and break barriers!", "with consistency!"
];

// Generate exactly 500 unique motivational messages (25 * 20 = 500)
export const messages = [];
for (let p1 of parts1) {
  for (let p2 of parts2) {
    messages.push(`${p1} ${p2}`);
  }
}

export const getDailyMessage = () => {
  const today = new Date();
  // Get the day of the year (1-365)
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  // Add year offset to keep it rotating across years
  const yearOffset = today.getFullYear() * 365;
  const index = (dayOfYear + yearOffset) % messages.length;
  
  return messages[index];
};