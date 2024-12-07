import { Club } from "@/firebase/models/Club";

const getRandomClubName = () => {
  const adjectives = [
    "Royal",
    "Mighty",
    "Divine",
    "Supreme",
    "Imperial",
    "Golden",
    "Majestic",
    "Eternal",
    "Fierce",
    "Valiant",
    "Blazing",
    "Thunder",
    "Warrior",
    "Mystic",
    "Ancient",
    "Sacred",
    "Immortal",
    "Legendary",
    "Victorious",
  ];

  const nouns = [
    "Lions",
    "Warriors",
    "Tigers",
    "Dragons",
    "Knights",
    "Titans",
    "Eagles",
    "Panthers",
    "Falcons",
    "Bulls",
    "Sharks",
    "Cobra",
    "Ravens",
    "Stallions",
    "Vipers",
    "Garud",
    "Jungli",
    "Bajirao",
    "Maharathi",
  ];

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  const randomClubName = `${randomAdjective} ${randomNoun}`;

  return randomClubName;
};

export const getUniqueClubName = async () => {
  let randomClubName = getRandomClubName();

  let isClubExists = await Club.isClubExists(randomClubName.trim());
  let counter = 0;
  while (isClubExists) {
    randomClubName = getRandomClubName();
    isClubExists = await Club.isClubExists(randomClubName.trim());
    counter++;
    if (counter > 10) {
      return Math.random().toString(36).substring(2, 15);
    }
  }

  return randomClubName;
};
