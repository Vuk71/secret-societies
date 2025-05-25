
export type ZoneName = "Royal Chamber" | "Cathedral" | "Courtyard" | "Trading Bailey" | "Docks and Gates" | "Eastern Town Square" | "Western Town Square";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

// Master data structure for a secret card's complete details
export interface SecretCard {
  id: string; // Base ID for card type, e.g., "dg_common1"
  instanceId: string; // Unique ID for this specific instance of the card in game
  name: string;
  zone: ZoneName;
  rarity: "Common" | "Rare" | "Exotic";
  exploitEffect: string;
  revealEffect: string;
  flavor?: string;
}

// Structure for storing card references in Firestore (player hands, masks, decks)
export interface StoredSecretCardReference {
  id: string;       // Base ID of the card type (e.g., "dg_common1")
  instanceId: string; // Unique ID for this specific instance
}

export interface EventCard {
  id: string;
  name: string;
  description: string;
}

export interface VictoryCondition {
  id: string;
  name: string;
  description: string;
  isAchieved: (gameState: GameState, playerId: string) => boolean;
}

export type PlayerResourceType = "gold" | "trust" | "information" | "secrecy";

export interface Player {
  id: string;
  name: string;
  gold: number;
  trust: number;
  information: number;
  secrecy: number;
  hand: StoredSecretCardReference[];
  masks: {
    lunar: StoredSecretCardReference | null;
    solar: StoredSecretCardReference | null;
    shadow: StoredSecretCardReference | null;
    eclipse: StoredSecretCardReference | null;
  };
  currentZone: ZoneName;
  victoryCondition: Omit<VictoryCondition, 'isAchieved'> | null;
  isEliminated: boolean;
  pendingHandRevealRequestFrom?: { playerId: string; playerName: string } | null;
  isVictoryConditionRevealed?: boolean; // New field
}

export interface Zone {
  name: ZoneName;
  borders: ZoneName[];
  secretDeck: StoredSecretCardReference[];
}

export interface GameState {
  sessionId: string;
  players: Player[];
  currentPlayerId:string;
  currentTurnPlayerIndex: number;
  vcSelectionPlayerIndex: number;
  round: number;
  turnPhase: TurnPhase;
  suspicion: number;
  activeEvent: EventCard | null;
  upcomingEvent: EventCard | null;
  zones: Zone[];
  turnOrder: string[];
  gameLog: string[];
  password?: string;
  maxSuspicionAdjustment: number;
  currentRoundSuspicionNetChange: number;
  revealedHand?: { forPlayerId: string; targetPlayerName: string; hand: StoredSecretCardReference[] } | null;
  revealedMaskTypesThisTurn?: Array<keyof Player['masks']>;
  eventDeck?: EventCard[];
  availableVictoryConditions?: Omit<VictoryCondition, 'isAchieved'>[];
  currentlyRevealedMasks?: Array<{ playerId: string; maskType: keyof Player['masks']; revealedByPlayerId: string }>;
}

export type TurnPhase = "VC_SELECTION" | "Draw" | "Return Exploits" | "Exploit Secrets" | "Reveal Secrets" | "End of Turn" | "Round Start";

export type DrawStep = "presenting" | "confirming" | null;
export type ExploitStep = "selectCard" | "selectMask" | null;
export type RevealStep = "selectMask" | null;

let cardInstanceCounter = 0;
export function getNextCardInstanceId(baseId: string): string {
  cardInstanceCounter++;
  return `${baseId}_instance_${Date.now()}_${cardInstanceCounter}_${Math.random().toString(36).substring(2, 7)}`;
}


export const ZONE_NAMES: ZoneName[] = [
  "Royal Chamber",
  "Cathedral",
  "Courtyard",
  "Trading Bailey",
  "Docks and Gates",
  "Eastern Town Square",
  "Western Town Square"
];

export const ZONES_DATA: Omit<Zone, 'secretDeck'>[] = [
  { name: "Royal Chamber", borders: ["Courtyard", "Cathedral"] },
  { name: "Cathedral", borders: ["Courtyard", "Eastern Town Square", "Trading Bailey", "Royal Chamber"] },
  { name: "Courtyard", borders: ["Cathedral", "Western Town Square", "Trading Bailey", "Royal Chamber"] },
  { name: "Trading Bailey", borders: ["Cathedral", "Courtyard", "Docks and Gates", "Eastern Town Square", "Western Town Square"] },
  { name: "Docks and Gates", borders: ["Eastern Town Square", "Western Town Square", "Trading Bailey"] },
  { name: "Eastern Town Square", borders: ["Docks and Gates", "Cathedral", "Trading Bailey"] },
  { name: "Western Town Square", borders: ["Docks and Gates", "Courtyard", "Trading Bailey"] },
];


// Helper function to create a shuffled array
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Server-side helper
export const getFullSecretCardDetailsServer = (cardRef: StoredSecretCardReference | null): Omit<SecretCard, 'instanceId'> | null => {
  if (!cardRef) return null;
  return mockSecretCards.find(c => c.id === cardRef.id) || null;
};

// --- Docks and Gates Cards ---
const docksAndGatesCards: Omit<SecretCard, 'instanceId'>[] = [
  {
    id: 'dg_common1', name: "Port Authority Bribe", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Gain 2 Gold. You May Adjust Suspicion by 1.",
    revealEffect: "The Revealing Player Must Steal 2 Gold from you. You Lose 2 Gold. The Revealing Player Must Raise Suspicion by 1.",
    flavor: "Pay a small fee to ensure smooth passage through the busy docks, with a promise of discretion from those in power."
  },
  {
    id: 'dg_common1_2', name: "Port Authority Bribe", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Gain 2 Gold. You May Adjust Suspicion by 1.",
    revealEffect: "The Revealing Player Must Steal 2 Gold from you. You Lose 2 Gold. The Revealing Player Must Raise Suspicion by 1.",
    flavor: "Pay a small fee to ensure smooth passage through the busy docks, with a promise of discretion from those in power."
  },
  {
    id: 'dg_common1_3', name: "Port Authority Bribe", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Gain 2 Gold. You May Adjust Suspicion by 1.",
    revealEffect: "The Revealing Player Must Steal 2 Gold from you. You Lose 2 Gold. The Revealing Player Must Raise Suspicion by 1.",
    flavor: "Pay a small fee to ensure smooth passage through the busy docks, with a promise of discretion from those in power."
  },
  {
    id: 'dg_common2', name: "Coastal Spy", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Gain 1 Information. You May Pay 1 Gold to Gain Insight on 1 target Secret in an opponent's hand. If it is a Common Secret, you May Use its Exploitation effect OR you may Pay 2 Information to Conceal and Delay this Secret.",
    revealEffect: "The Revealing Player chooses: You Lose 3 Information, OR you Lose 1 Trust.",
    flavor: "A network of eyes along the coastline, exchanging secrets for favors, always watching for the right moment to strike."
  },
  {
    id: 'dg_common2_2', name: "Coastal Spy", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Gain 1 Information. You May Pay 1 Gold to Gain Insight on 1 target Secret in an opponent's hand. If it is a Common Secret, you May Use its Exploitation effect OR you may Pay 2 Information to Conceal and Delay this Secret.",
    revealEffect: "The Revealing Player chooses: You Lose 3 Information, OR you Lose 1 Trust.",
    flavor: "A network of eyes along the coastline, exchanging secrets for favors, always watching for the right moment to strike."
  },
  {
    id: 'dg_common2_3', name: "Coastal Spy", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Gain 1 Information. You May Pay 1 Gold to Gain Insight on 1 target Secret in an opponent's hand. If it is a Common Secret, you May Use its Exploitation effect OR you may Pay 2 Information to Conceal and Delay this Secret.",
    revealEffect: "The Revealing Player chooses: You Lose 3 Information, OR you Lose 1 Trust.",
    flavor: "A network of eyes along the coastline, exchanging secrets for favors, always watching for the right moment to strike."
  },
  {
    id: 'dg_common3', name: "Shipment Delay", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "You Must Steal 1 Gold from one target player. Apply Delay to one target opponent's Exploited Secret.",
    revealEffect: "Discard 1 Secret from your hand. Apply Delay to this Secret.",
    flavor: "A whispered word at the docks causes the cargo to be 'misplaced'—a Delay that benefits those who know how to use it."
  },
  {
    id: 'dg_common3_2', name: "Shipment Delay", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "You Must Steal 1 Gold from one target player. Apply Delay to one target opponent's Exploited Secret.",
    revealEffect: "Discard 1 Secret from your hand. Apply Delay to this Secret.",
    flavor: "A whispered word at the docks causes the cargo to be 'misplaced'—a Delay that benefits those who know how to use it."
  },
  {
    id: 'dg_common3_3', name: "Shipment Delay", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "You Must Steal 1 Gold from one target player. Apply Delay to one target opponent's Exploited Secret.",
    revealEffect: "Discard 1 Secret from your hand. Apply Delay to this Secret.",
    flavor: "A whispered word at the docks causes the cargo to be 'misplaced'—a Delay that benefits those who know how to use it."
  },
  {
    id: 'dg_common4', name: "Smuggler\'s Network", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Steal 2 Gold from one target player. You May Raise Suspicion by 1.",
    revealEffect: "Lose 1 Gold. Lose 1 Trust. The Revealing Player Must Raise Suspicion by 1.",
    flavor: "Hidden routes and Secret deals flow through the shadows, where gold changes hands and laws are forgotten."
  },
  {
    id: 'dg_common5', name: "Pirates\' Location", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Pay 1 Gold to Gain 1 Information. Each other player Must choose one: Lose 1 Gold OR Lose 1 Information.",
    revealEffect: "Lose 1 Trust.",
    flavor: "A map passed down through whispers, leading to treasures hidden in dangerous waters, where only the brave dare venture."
  },
  {
    id: 'dg_common5_2', name: "Pirates\' Location", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Pay 1 Gold to Gain 1 Information. Each other player Must choose one: Lose 1 Gold OR Lose 1 Information.",
    revealEffect: "Lose 1 Trust.",
    flavor: "A map passed down through whispers, leading to treasures hidden in dangerous waters, where only the brave dare venture."
  },
  {
    id: 'dg_common5_3', name: "Pirates\' Location", zone: "Docks and Gates", rarity: "Common",
    exploitEffect: "Pay 1 Gold to Gain 1 Information. Each other player Must choose one: Lose 1 Gold OR Lose 1 Information.",
    revealEffect: "Lose 1 Trust.",
    flavor: "A map passed down through whispers, leading to treasures hidden in dangerous waters, where only the brave dare venture."
  },
  {
    id: 'dg_rare1', name: "The Hidden Sail", zone: "Docks and Gates", rarity: "Rare",
    exploitEffect: "Gain the Ability to: Sell Secrets from your hand for 4 Gold each, or your Exploited Secrets for 2 Gold each, until your next turn. Sold Secrets are Discarded.",
    revealEffect: "Discard this Secret. Discard 1 additional Secret from your hand. The Revealing Player May Raise Suspicion by 2.",
    flavor: "A discreet vessel waits in the harbor, ready to sail into the unknown, unseen by those who seek to control the tides."
  },
  {
    id: 'dg_rare1_2', name: "The Hidden Sail", zone: "Docks and Gates", rarity: "Rare",
    exploitEffect: "Gain the Ability to: Sell Secrets from your hand for 4 Gold each, or your Exploited Secrets for 2 Gold each, until your next turn. Sold Secrets are Discarded.",
    revealEffect: "Discard this Secret. Discard 1 additional Secret from your hand. The Revealing Player May Raise Suspicion by 2.",
    flavor: "A discreet vessel waits in the harbor, ready to sail into the unknown, unseen by those who seek to control the tides."
  },
  {
    id: 'dg_rare2', name: "Merchant\'s Letter", zone: "Docks and Gates", rarity: "Rare",
    exploitEffect: "Gain 3 Gold. Gain Insight on 2 target Secrets in opponents' hands (can belong to the same or different opponents). You May Exchange the positions of those 2 Secrets.",
    revealEffect: "Discard 1 Secret from your hand. Lose 2 Trust.",
    flavor: "A letter sealed with wax, promising trade secrets and untold riches—but only for those willing to honor the unspoken agreements."
  },
  {
    id: 'dg_rare2_2', name: "Merchant\'s Letter", zone: "Docks and Gates", rarity: "Rare",
    exploitEffect: "Gain 3 Gold. Gain Insight on 2 target Secrets in opponents' hands (can belong to the same or different opponents). You May Exchange the positions of those 2 Secrets.",
    revealEffect: "Discard 1 Secret from your hand. Lose 2 Trust.",
    flavor: "A letter sealed with wax, promising trade secrets and untold riches—but only for those willing to honor the unspoken agreements."
  },
  {
    id: 'dg_exotic1', name: "Whispers of the Tide", zone: "Docks and Gates", rarity: "Exotic",
    exploitEffect: "Gain 2 Gold. Gain 2 Information. You May immediately perform 1 Reveal action targeting any Mask (Pay no Information cost for this action).",
    revealEffect: "Lose 3 Trust. Choose 1 adjacent Exploited Secret you control: Immediately trigger its Reveal Effect (The Revealing Player chooses any options within the triggered effect; the target Secret cannot be Discarded instead of triggering unless specified by its own effect or an Event).",
    flavor: " The waves carry secrets, and soon, they’ll reach the ears they’re meant for."
  }
];

// --- Town Square Cards (Template) ---
const townSquareCardData: Omit<SecretCard, 'instanceId' | 'zone'>[] = [
  {
    id: 'ts_common1', name: "Common Gossip", rarity: "Common" as const,
    exploitEffect: "Adjust Suspicion by 2.",
    revealEffect: "The Revealing Player Gains Insight on one Secret in your hand. The Revealing Player chooses: Apply Delay to this Secret OR the Revealing Player May Pay 2 Gold to Steal this Secret.",
    flavor: "A rumor spreads through the market, but its true weight is yet to be felt."
  },
  {
    id: 'ts_common1_2', name: "Common Gossip", rarity: "Common" as const,
    exploitEffect: "Adjust Suspicion by 2.",
    revealEffect: "The Revealing Player Gains Insight on one Secret in your hand. The Revealing Player chooses: Apply Delay to this Secret OR the Revealing Player May Pay 2 Gold to Steal this Secret.",
    flavor: "A rumor spreads through the market, but its true weight is yet to be felt."
  },
  {
    id: 'ts_common1_3', name: "Common Gossip", rarity: "Common" as const,
    exploitEffect: "Adjust Suspicion by 2.",
    revealEffect: "The Revealing Player Gains Insight on one Secret in your hand. The Revealing Player chooses: Apply Delay to this Secret OR the Revealing Player May Pay 2 Gold to Steal this Secret.",
    flavor: "A rumor spreads through the market, but its true weight is yet to be felt."
  },
  {
    id: 'ts_common2', name: "Merchant\'s Offer", rarity: "Common" as const,
    exploitEffect: "Gain 2 Gold. If your Trust is 10 or higher, you May Pay 1 Gold to Gain Immunity (Gold Steal).",
    revealEffect: "Discard this Secret and Lose Immunity (Gold Steal).",
    flavor: "A tempting offer, but there\'s always a price to pay for convenience."
  },
  {
    id: 'ts_common2_2', name: "Merchant\'s Offer", rarity: "Common" as const,
    exploitEffect: "Gain 2 Gold. If your Trust is 10 or higher, you May Pay 1 Gold to Gain Immunity (Gold Steal).",
    revealEffect: "Discard this Secret and Lose Immunity (Gold Steal).",
    flavor: "A tempting offer, but there\'s always a price to pay for convenience."
  },
  {
    id: 'ts_common2_3', name: "Merchant\'s Offer", rarity: "Common" as const,
    exploitEffect: "Gain 2 Gold. If your Trust is 10 or higher, you May Pay 1 Gold to Gain Immunity (Gold Steal).",
    revealEffect: "Discard this Secret and Lose Immunity (Gold Steal).",
    flavor: "A tempting offer, but there\'s always a price to pay for convenience."
  },
  {
    id: 'ts_common3', name: "Tavern Brawl", rarity: "Common" as const,
    exploitEffect: "Immediately perform 1 Reveal action targeting the Mask this Secret is assigned to (Pay no Information cost for this action). This Secret is not affected by this Reveal action.",
    revealEffect: "Lose 3 Gold.",
    flavor: "A fight erupts, and with it, secrets are exposed in the chaos."
  },
  {
    id: 'ts_common3_2', name: "Tavern Brawl", rarity: "Common" as const,
    exploitEffect: "Immediately perform 1 Reveal action targeting the Mask this Secret is assigned to (Pay no Information cost for this action). This Secret is not affected by this Reveal action.",
    revealEffect: "Lose 3 Gold.",
    flavor: "A fight erupts, and with it, secrets are exposed in the chaos."
  },
  {
    id: 'ts_common3_3', name: "Tavern Brawl", rarity: "Common" as const,
    exploitEffect: "Immediately perform 1 Reveal action targeting the Mask this Secret is assigned to (Pay no Information cost for this action). This Secret is not affected by this Reveal action.",
    revealEffect: "Lose 3 Gold.",
    flavor: "A fight erupts, and with it, secrets are exposed in the chaos."
  },
  {
    id: 'ts_common4', name: "Old Friend in the Square", rarity: "Common" as const,
    exploitEffect: "Gain Insight on the top 3 Secrets of any one target Zone Deck. You May Exchange 1 of those Secrets with 1 Secret from your hand (both Secrets must belong to the same Zone).",
    revealEffect: "Lose 1 Gold and Lose 1 Trust, OR Discard this Secret.",
    flavor: "Old alliances are tested when familiar faces cross paths in the square."
  },
  {
    id: 'ts_common4_2', name: "Old Friend in the Square", rarity: "Common" as const,
    exploitEffect: "Gain Insight on the top 3 Secrets of any one target Zone Deck. You May Exchange 1 of those Secrets with 1 Secret from your hand (both Secrets must belong to the same Zone).",
    revealEffect: "Lose 1 Gold and Lose 1 Trust, OR Discard this Secret.",
    flavor: "Old alliances are tested when familiar faces cross paths in the square."
  },
  {
    id: 'ts_common4_3', name: "Old Friend in the Square", rarity: "Common" as const,
    exploitEffect: "Gain Insight on the top 3 Secrets of any one target Zone Deck. You May Exchange 1 of those Secrets with 1 Secret from your hand (both Secrets must belong to the same Zone).",
    revealEffect: "Lose 1 Gold and Lose 1 Trust, OR Discard this Secret.",
    flavor: "Old alliances are tested when familiar faces cross paths in the square."
  },
  {
    id: 'ts_common5', name: "City Watch", rarity: "Common" as const,
    exploitEffect: "You May Adjust Suspicion by 1. You May Pay 1 Gold to Gain 1 Trust and May Adjust Suspicion by 1 again.",
    revealEffect: "Lose 1 Gold. Lose 1 Trust. Lose 1 Information.",
    flavor: "The watchful eyes of the city never miss a coin or a secret."
  },
  {
    id: 'ts_common5_2', name: "City Watch", rarity: "Common" as const,
    exploitEffect: "You May Adjust Suspicion by 1. You May Pay 1 Gold to Gain 1 Trust and May Adjust Suspicion by 1 again.",
    revealEffect: "Lose 1 Gold. Lose 1 Trust. Lose 1 Information.",
    flavor: "The watchful eyes of the city never miss a coin or a secret."
  },
  {
    id: 'ts_common5_3', name: "City Watch", rarity: "Common" as const,
    exploitEffect: "You May Adjust Suspicion by 1. You May Pay 1 Gold to Gain 1 Trust and May Adjust Suspicion by 1 again.",
    revealEffect: "Lose 1 Gold. Lose 1 Trust. Lose 1 Information.",
    flavor: "The watchful eyes of the city never miss a coin or a secret."
  },
  {
    id: 'ts_rare1', name: "The Informant", rarity: "Rare" as const,
    exploitEffect: "Gain the ability to: Pay 1 Gold to Must Steal 2 Information from any target player.",
    revealEffect: "The Revealing Player Must Steal 2 Information from you. Discard this Secret.",
    flavor: "Whispers in the dark corners can reveal more than any royal decree."
  },
  {
    id: 'ts_rare1_2', name: "The Informant", rarity: "Rare" as const,
    exploitEffect: "Gain the ability to: Pay 1 Gold to Must Steal 2 Information from any target player.",
    revealEffect: "The Revealing Player Must Steal 2 Information from you. Discard this Secret.",
    flavor: "Whispers in the dark corners can reveal more than any royal decree."
  },
  {
    id: 'ts_rare2', name: "Ambush in the Alley", rarity: "Rare" as const,
    exploitEffect: "Apply Delay to all other Secrets currently Exploited on the same Mask as this Secret.",
    revealEffect: "Lose 1 Trust. Discard this Secret. The Revealing Player Must Raise Suspicion by 1.",
    flavor: "The shadows conceal a dagger\'s strike — your trust betrayed in silence"
  },
  {
    id: 'ts_rare2_2', name: "Ambush in the Alley", rarity: "Rare" as const,
    exploitEffect: "Apply Delay to all other Secrets currently Exploited on the same Mask as this Secret.",
    revealEffect: "Lose 1 Trust. Discard this Secret. The Revealing Player Must Raise Suspicion by 1.",
    flavor: "The shadows conceal a dagger\'s strike — your trust betrayed in silence"
  },
  {
    id: 'ts_exotic1', name: "Bribed Guards", rarity: "Exotic" as const,
    exploitEffect: "Pay 2 Gold to Draw 3 Secrets from your current Zone Deck. Choose 2 Secrets to Keep and Discard the third. You May Adjust Suspicion by 2.",
    revealEffect: "You Must Lose 3 Gold and Lose 2 Trust. If you cannot Lose the full 3 Gold, you Must Lose 1 additional Trust instead.",
    flavor: "A few coins in the right hands can silence the watchful eyes."
  }
];

// --- Generate Zone-Specific Town Square Cards ---
const generateZoneSpecificCards = (zoneName: "Eastern Town Square" | "Western Town Square", cardData: Omit<SecretCard, 'instanceId' | 'zone'>[]): Omit<SecretCard, 'instanceId'>[] => {
  const prefix = zoneName === "Eastern Town Square" ? "ets" : "wts";
  return cardData.map(cardDef => ({
    ...cardDef,
    id: `${prefix}_${cardDef.id.split('_')[1]}`,
    zone: zoneName,
  }));
};
const easternTownSquareCards = generateZoneSpecificCards("Eastern Town Square", townSquareCardData);
const westernTownSquareCards = generateZoneSpecificCards("Western Town Square", townSquareCardData);

// --- Trading Bailey Cards ---
const tradingBaileyCards: Omit<SecretCard, 'instanceId'>[] = [
  {
    id: 'tb_common1', name: "Merchant\'s Favor", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Move your character to an adjacent zone. Draw 2 Secrets from that zone's deck. You May Pay 1 Gold and 1 Information for each of these drawn Secrets you wish to Keep. Discard any drawn Secrets you do not Pay for.",
    revealEffect: "The Revealing Player Gains this Secret's Exploitation effect and Steals this Secret from you.",
    flavor: "A deal struck in the shadows, one that could tip the balance in your favor."
  },
  {
    id: 'tb_common1_2', name: "Merchant\'s Favor", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Move your character to an adjacent zone. Draw 2 Secrets from that zone's deck. You May Pay 1 Gold and 1 Information for each of these drawn Secrets you wish to Keep. Discard any drawn Secrets you do not Pay for.",
    revealEffect: "The Revealing Player Gains this Secret's Exploitation effect and Steals this Secret from you.",
    flavor: "A deal struck in the shadows, one that could tip the balance in your favor."
  },
  {
    id: 'tb_common1_3', name: "Merchant\'s Favor", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Move your character to an adjacent zone. Draw 2 Secrets from that zone's deck. You May Pay 1 Gold and 1 Information for each of these drawn Secrets you wish to Keep. Discard any drawn Secrets you do not Pay for.",
    revealEffect: "The Revealing Player Gains this Secret's Exploitation effect and Steals this Secret from you.",
    flavor: "A deal struck in the shadows, one that could tip the balance in your favor."
  },
  {
    id: 'tb_common2', name: "Courier\'s Trail", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Draw 1 Secret from another bordering zone and Keep it.",
    revealEffect: "Discard 1 Secret from your hand (the Revealing Player chooses which).",
    flavor: "A hurried message left behind, revealing more than intended."
  },
  {
    id: 'tb_common2_2', name: "Courier\'s Trail", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Draw 1 Secret from another bordering zone and Keep it.",
    revealEffect: "Discard 1 Secret from your hand (the Revealing Player chooses which).",
    flavor: "A hurried message left behind, revealing more than intended."
  },
  {
    id: 'tb_common2_3', name: "Courier\'s Trail", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Draw 1 Secret from another bordering zone and Keep it.",
    revealEffect: "Discard 1 Secret from your hand (the Revealing Player chooses which).",
    flavor: "A hurried message left behind, revealing more than intended."
  },
  {
    id: 'tb_common3', name: "Trade Route Blockade", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Gain 1 Gold for each player character (including yours) in your current zone and all adjacent zones. You May Move one target opponent's character to a zone adjacent to their current one.",
    revealEffect: "Lose 3 Gold. The Revealing Player Moves your character to this zone or an adjacent zone.",
    flavor: "The flow of goods is halted, and so too are your plans."
  },
  {
    id: 'tb_common3_2', name: "Trade Route Blockade", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Gain 1 Gold for each player character (including yours) in your current zone and all adjacent zones. You May Move one target opponent's character to a zone adjacent to their current one.",
    revealEffect: "Lose 3 Gold. The Revealing Player Moves your character to this zone or an adjacent zone.",
    flavor: "The flow of goods is halted, and so too are your plans."
  },
  {
    id: 'tb_common3_3', name: "Trade Route Blockade", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Gain 1 Gold for each player character (including yours) in your current zone and all adjacent zones. You May Move one target opponent's character to a zone adjacent to their current one.",
    revealEffect: "Lose 3 Gold. The Revealing Player Moves your character to this zone or an adjacent zone.",
    flavor: "The flow of goods is halted, and so too are your plans."
  },
  {
    id: 'tb_common4', name: "Market Gossip", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Perform the Draw phase again, drawing only from the Trading Bailey deck.",
    revealEffect: "Discard this Secret. Discard 1 additional Secret from your hand. If your character is in the Trading Bailey, Move your character to a different zone.",
    flavor: "Whispers of deals and Secrets spread quickly in the crowded stalls."
  },
  {
    id: 'tb_common4_2', name: "Market Gossip", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Perform the Draw phase again, drawing only from the Trading Bailey deck.",
    revealEffect: "Discard this Secret. Discard 1 additional Secret from your hand. If your character is in the Trading Bailey, Move your character to a different zone.",
    flavor: "Whispers of deals and Secrets spread quickly in the crowded stalls."
  },
  {
    id: 'tb_common4_3', name: "Market Gossip", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Perform the Draw phase again, drawing only from the Trading Bailey deck.",
    revealEffect: "Discard this Secret. Discard 1 additional Secret from your hand. If your character is in the Trading Bailey, Move your character to a different zone.",
    flavor: "Whispers of deals and Secrets spread quickly in the crowded stalls."
  },
  {
    id: 'tb_common5', name: "Customs Inspection", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Gain 1 Information. Gain Insight on one target Secret in another player's hand. If it is a Common Secret, Adjust Suspicion by 1; otherwise, Adjust Suspicion by 2.",
    revealEffect: "The Revealing Player Steals 1 Trust from you. Discard this Secret. You cannot move your character during your next End of Turn phase.",
    flavor: "A routine check reveals more than just the cargo."
  },
  {
    id: 'tb_common5_2', name: "Customs Inspection", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Gain 1 Information. Gain Insight on one target Secret in another player's hand. If it is a Common Secret, Adjust Suspicion by 1; otherwise, Adjust Suspicion by 2.",
    revealEffect: "The Revealing Player Steals 1 Trust from you. Discard this Secret. You cannot move your character during your next End of Turn phase.",
    flavor: "A routine check reveals more than just the cargo."
  },
  {
    id: 'tb_common5_3', name: "Customs Inspection", zone: "Trading Bailey", rarity: "Common",
    exploitEffect: "Gain 1 Information. Gain Insight on one target Secret in another player's hand. If it is a Common Secret, Adjust Suspicion by 1; otherwise, Adjust Suspicion by 2.",
    revealEffect: "The Revealing Player Steals 1 Trust from you. Discard this Secret. You cannot move your character during your next End of Turn phase.",
    flavor: "A routine check reveals more than just the cargo."
  },
  {
    id: 'tb_rare1', name: "Smuggler\'s Shortcut", zone: "Trading Bailey", rarity: "Rare",
    exploitEffect: "Move your character to any zone. Draw 2 Secrets from that zone's deck. You May Use the Exploitation effect of one of those Secrets immediately, then Discard both.",
    revealEffect: "The Revealing Player Gains Insight on all Secrets currently in your hand. Then, the Revealing Player Steals 1 Secret of their choice from your hand. If you have no Secrets in hand, the Revealing Player Draws 1 Secret from the deck corresponding to your character's current zone instead.",
    flavor: "The shadows offer a quicker path, but danger lurks around every corner."
  },
  {
    id: 'tb_rare1_2', name: "Smuggler\'s Shortcut", zone: "Trading Bailey", rarity: "Rare",
    exploitEffect: "Move your character to any zone. Draw 2 Secrets from that zone's deck. You May Use the Exploitation effect of one of those Secrets immediately, then Discard both.",
    revealEffect: "The Revealing Player Gains Insight on all Secrets currently in your hand. Then, the Revealing Player Steals 1 Secret of their choice from your hand. If you have no Secrets in hand, the Revealing Player Draws 1 Secret from the deck corresponding to your character's current zone instead.",
    flavor: "The shadows offer a quicker path, but danger lurks around every corner."
  },
  {
    id: 'tb_rare2', name: "Guild Alliance", zone: "Trading Bailey", rarity: "Rare",
    exploitEffect: "Gain Immunity (Gold Loss) and Immunity (Gold Steal) until your next turn. If another player's character is in your zone, you Must Steal 3 Gold from that player.",
    revealEffect: "The Revealing Player Steals 2 Trust from you.",
    flavor: "An agreement forged in shadows, bound by mutual interests and silent promises."
  },
  {
    id: 'tb_rare2_2', name: "Guild Alliance", zone: "Trading Bailey", rarity: "Rare",
    exploitEffect: "Gain Immunity (Gold Loss) and Immunity (Gold Steal) until your next turn. If another player's character is in your zone, you Must Steal 3 Gold from that player.",
    revealEffect: "The Revealing Player Steals 2 Trust from you.",
    flavor: "An agreement forged in shadows, bound by mutual interests and silent promises."
  },
  {
    id: 'tb_exotic1', name: "Golden Caravan", zone: "Trading Bailey", rarity: "Exotic",
    exploitEffect: "Gain 3 Gold. Move your character to any zone. Draw 1 Secret from any position in that zone's deck (without looking at the card faces first).",
    revealEffect: "The Revealing Player Steals all your Gold. If the amount Stolen is less than 4, the Revealing Player Gains Gold from the supply until the total Gold gained from this effect is 4.",
    flavor: "A convoy laden with wealth, where every stop hides a potential deal or betrayal."
  }
];

// --- Courtyard Cards ---
const courtyardCards: Omit<SecretCard, 'instanceId'>[] = [
  {
    id: 'cy_common1', name: "Noble Whisper", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Choose one zone. Gain 2 Information for each player character (including yours) currently in that zone.",
    revealEffect: "Exchange this Secret with the top Secret of the Courtyard deck. The Revealing Player May Adjust Suspicion by 1.",
    flavor: "A quiet conversation in the shadows, where power is Exchanged in hushed tones."
  },
  {
    id: 'cy_common1_2', name: "Noble Whisper", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Choose one zone. Gain 2 Information for each player character (including yours) currently in that zone.",
    revealEffect: "Exchange this Secret with the top Secret of the Courtyard deck. The Revealing Player May Adjust Suspicion by 1.",
    flavor: "A quiet conversation in the shadows, where power is Exchanged in hushed tones."
  },
  {
    id: 'cy_common1_3', name: "Noble Whisper", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Choose one zone. Gain 2 Information for each player character (including yours) currently in that zone.",
    revealEffect: "Exchange this Secret with the top Secret of the Courtyard deck. The Revealing Player May Adjust Suspicion by 1.",
    flavor: "A quiet conversation in the shadows, where power is Exchanged in hushed tones."
  },
  {
    id: 'cy_common2', name: "Misplaced Loyalty", zone: "Courtyard", rarity: "Common",
    exploitEffect: "For each other Secret currently Exploited on the same Mask as this one, you Steal 2 Information from that Secret's owner.",
    revealEffect: "The Revealing Player Must Steal one Exploited Secret of their choice from your Masks.",
    flavor: "Their allegiance wavers, but the consequences of betrayal are yours to bear."
  },
  {
    id: 'cy_common2_2', name: "Misplaced Loyalty", zone: "Courtyard", rarity: "Common",
    exploitEffect: "For each other Secret currently Exploited on the same Mask as this one, you Steal 2 Information from that Secret's owner.",
    revealEffect: "The Revealing Player Must Steal one Exploited Secret of their choice from your Masks.",
    flavor: "Their allegiance wavers, but the consequences of betrayal are yours to bear."
  },
  {
    id: 'cy_common2_3', name: "Misplaced Loyalty", zone: "Courtyard", rarity: "Common",
    exploitEffect: "For each other Secret currently Exploited on the same Mask as this one, you Steal 2 Information from that Secret's owner.",
    revealEffect: "The Revealing Player Must Steal one Exploited Secret of their choice from your Masks.",
    flavor: "Their allegiance wavers, but the consequences of betrayal are yours to bear."
  },
  {
    id: 'cy_common3', name: "Hidden Pact", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Gain 1 Trust. Each other player who has a Secret Exploited on the same Mask as this one May Pay you 1 Gold to Gain 1 Trust.",
    revealEffect: "Apply Delay to this Secret. The Revealing Player Must Steal 1 Information from you.",
    flavor: "A Secret agreement, forged in the shadows, waiting for the right moment to be revealed."
  },
  {
    id: 'cy_common3_2', name: "Hidden Pact", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Gain 1 Trust. Each other player who has a Secret Exploited on the same Mask as this one May Pay you 1 Gold to Gain 1 Trust.",
    revealEffect: "Apply Delay to this Secret. The Revealing Player Must Steal 1 Information from you.",
    flavor: "A Secret agreement, forged in the shadows, waiting for the right moment to be revealed."
  },
  {
    id: 'cy_common3_3', name: "Hidden Pact", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Gain 1 Trust. Each other player who has a Secret Exploited on the same Mask as this one May Pay you 1 Gold to Gain 1 Trust.",
    revealEffect: "Apply Delay to this Secret. The Revealing Player Must Steal 1 Information from you.",
    flavor: "A Secret agreement, forged in the shadows, waiting for the right moment to be revealed."
  },
  {
    id: 'cy_common4', name: "Hidden Grudge", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Choose 2 players (you may choose yourself as one). Steal 1 Gold from each chosen player. Each chosen player May then choose to Pay 1 Gold OR Pay 2 Information; if they do, the other chosen player Loses 1 Trust. If neither chosen player Pays, you Gain 1 Trust.",
    revealEffect: "Lose 1 Trust. The Revealing Player May Raise Suspicion by 1.",
    flavor: "Beneath the smiles and pleasantries, an old rivalry brews, ready to erupt at the wrong moment."
  },
  {
    id: 'cy_common4_2', name: "Hidden Grudge", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Choose 2 players (you may choose yourself as one). Steal 1 Gold from each chosen player. Each chosen player May then choose to Pay 1 Gold OR Pay 2 Information; if they do, the other chosen player Loses 1 Trust. If neither chosen player Pays, you Gain 1 Trust.",
    revealEffect: "Lose 1 Trust. The Revealing Player May Raise Suspicion by 1.",
    flavor: "Beneath the smiles and pleasantries, an old rivalry brews, ready to erupt at the wrong moment."
  },
  {
    id: 'cy_common4_3', name: "Hidden Grudge", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Choose 2 players (you may choose yourself as one). Steal 1 Gold from each chosen player. Each chosen player May then choose to Pay 1 Gold OR Pay 2 Information; if they do, the other chosen player Loses 1 Trust. If neither chosen player Pays, you Gain 1 Trust.",
    revealEffect: "Lose 1 Trust. The Revealing Player May Raise Suspicion by 1.",
    flavor: "Beneath the smiles and pleasantries, an old rivalry brews, ready to erupt at the wrong moment."
  },
  {
    id: 'cy_common5', name: "Unwelcome Gift", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Place this Secret on one of your Masks then choose one opponent. Move this Secret onto one of their empty Mask slots (it is now considered Exploited by them). (Note: This provides no beneficial effect to the opponent). That player May return this Secret to their hand during their Return Exploits phase by Paying an additional 2 Information.",
    revealEffect: "Lose 2 Trust. Discard this Secret.",
    flavor: "You didn't ask for it, but it's yours now."
  },
  {
    id: 'cy_common5_2', name: "Unwelcome Gift", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Place this Secret on one of your Masks then choose one opponent. Move this Secret onto one of their empty Mask slots (it is now considered Exploited by them). (Note: This provides no beneficial effect to the opponent). That player May return this Secret to their hand during their Return Exploits phase by Paying an additional 2 Information.",
    revealEffect: "Lose 2 Trust. Discard this Secret.",
    flavor: "You didn't ask for it, but it's yours now."
  },
  {
    id: 'cy_common5_3', name: "Unwelcome Gift", zone: "Courtyard", rarity: "Common",
    exploitEffect: "Place this Secret on one of your Masks then choose one opponent. Move this Secret onto one of their empty Mask slots (it is now considered Exploited by them). (Note: This provides no beneficial effect to the opponent). That player May return this Secret to their hand during their Return Exploits phase by Paying an additional 2 Information.",
    revealEffect: "Lose 2 Trust. Discard this Secret.",
    flavor: "You didn't ask for it, but it's yours now."
  },
  {
    id: 'cy_rare1', name: "Extortion Bargain", zone: "Courtyard", rarity: "Rare",
    exploitEffect: "The next Common or Rare Secret you Exploit this turn becomes Concealed immediately after you Exploit it. (Using this Exploitation does not grant an extra Exploit slot).",
    revealEffect: "The Mask slot this Secret was on cannot have Secrets Exploited onto it during your next Exploit Secrets phase. Discard this Secret.",
    flavor: "A whispered threat can hold more power than a shouted command."
  },
  {
    id: 'cy_rare1_2', name: "Extortion Bargain", zone: "Courtyard", rarity: "Rare",
    exploitEffect: "The next Common or Rare Secret you Exploit this turn becomes Concealed immediately after you Exploit it. (Using this Exploitation does not grant an extra Exploit slot).",
    revealEffect: "The Mask slot this Secret was on cannot have Secrets Exploited onto it during your next Exploit Secrets phase. Discard this Secret.",
    flavor: "A whispered threat can hold more power than a shouted command."
  },
  {
    id: 'cy_rare2', name: "Spy in the Shadows", zone: "Courtyard", rarity: "Rare",
    exploitEffect: "Gain 1 Information for each Secret currently Exploited on the board (including this one).",
    revealEffect: "Choose one: Lose 2 Trust, OR Discard this Secret and Discard one additional Secret from your hand. The Revealing Player May Adjust Suspicion by 1.",
    flavor: "A passing glance reveals more than words ever could."
  },
  {
    id: 'cy_rare2_2', name: "Spy in the Shadows", zone: "Courtyard", rarity: "Rare",
    exploitEffect: "Gain 1 Information for each Secret currently Exploited on the board (including this one).",
    revealEffect: "Choose one: Lose 2 Trust, OR Discard this Secret and Discard one additional Secret from your hand. The Revealing Player May Adjust Suspicion by 1.",
    flavor: "A passing glance reveals more than words ever could."
  },
  {
    id: 'cy_exotic1', name: "The King’s Ear", zone: "Courtyard", rarity: "Exotic",
    exploitEffect: "Discard all Exploited Secrets except this one. End the Exploitation Phase.",
    revealEffect: "You Must Discard 3 Secrets. First, Discard all Secrets from your hand (up to 3). If fewer than 3 Secrets were discarded from your hand, you Must Discard additional Exploited Secrets you control (you choose which, but you must include this Secret) until a total of 3 Secrets have been discarded.",
    flavor: "A whisper to the throne carries more weight than a thousand voices."
  }
];

// --- Cathedral Cards ---
const cathedralCards: Omit<SecretCard, 'instanceId'>[] = [
  {
    id: 'cat_common1', name: "The Whispering Priest", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Gain 1 Gold. Gain 1 Information. Choose 1 target Secret in an opponent's hand. Gain Insight on that Secret. Then, based on its rarity: If Common Secret, Gain 1 Gold OR 1 Information; If Rare Secret, Gain 2 Gold OR 2 Information; If Exotic Secret, Gain 3 Gold OR 3 Information.",
    revealEffect: "Lose 2 Gold. Lose 2 Information. Discard this Secret.",
    flavor: "Behind confessions lies a web of quiet influence."
  },
  {
    id: 'cat_common1_2', name: "The Whispering Priest", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Gain 1 Gold. Gain 1 Information. Choose 1 target Secret in an opponent's hand. Gain Insight on that Secret. Then, based on its rarity: If Common Secret, Gain 1 Gold OR 1 Information; If Rare Secret, Gain 2 Gold OR 2 Information; If Exotic Secret, Gain 3 Gold OR 3 Information.",
    revealEffect: "Lose 2 Gold. Lose 2 Information. Discard this Secret.",
    flavor: "Behind confessions lies a web of quiet influence."
  },
  {
    id: 'cat_common1_3', name: "The Whispering Priest", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Gain 1 Gold. Gain 1 Information. Choose 1 target Secret in an opponent's hand. Gain Insight on that Secret. Then, based on its rarity: If Common Secret, Gain 1 Gold OR 1 Information; If Rare Secret, Gain 2 Gold OR 2 Information; If Exotic Secret, Gain 3 Gold OR 3 Information.",
    revealEffect: "Lose 2 Gold. Lose 2 Information. Discard this Secret.",
    flavor: "Behind confessions lies a web of quiet influence."
  },
  {
    id: 'cat_common2', name: "Charity Dive", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Pay 1 Gold to Gain 2 Trust.",
    revealEffect: "The Revealing Player Must Steal 2 Gold and 1 Trust from you.",
    flavor: "A generous hand reaches out, but who truly benefits from the gift?"
  },
  {
    id: 'cat_common2_2', name: "Charity Dive", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Pay 1 Gold to Gain 2 Trust.",
    revealEffect: "The Revealing Player Must Steal 2 Gold and 1 Trust from you.",
    flavor: "A generous hand reaches out, but who truly benefits from the gift?"
  },
  {
    id: 'cat_common2_3', name: "Charity Dive", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Pay 1 Gold to Gain 2 Trust.",
    revealEffect: "The Revealing Player Must Steal 2 Gold and 1 Trust from you.",
    flavor: "A generous hand reaches out, but who truly benefits from the gift?"
  },
  {
    id: 'cat_common3', name: "Silent Witness", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Gain 2 Information for each other Secret currently Exploited on the Mask where this Secret is placed.",
    revealEffect: "Discard this Secret. The Revealing Player Steals 1 Information from you and Gains 1 additional Information from the supply.",
    flavor: "Some truths are too dangerous to speak, but eyes cannot unsee."
  },
  {
    id: 'cat_common3_2', name: "Silent Witness", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Gain 2 Information for each other Secret currently Exploited on the Mask where this Secret is placed.",
    revealEffect: "Discard this Secret. The Revealing Player Steals 1 Information from you and Gains 1 additional Information from the supply.",
    flavor: "Some truths are too dangerous to speak, but eyes cannot unsee."
  },
  {
    id: 'cat_common3_3', name: "Silent Witness", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Gain 2 Information for each other Secret currently Exploited on the Mask where this Secret is placed.",
    revealEffect: "Discard this Secret. The Revealing Player Steals 1 Information from you and Gains 1 additional Information from the supply.",
    flavor: "Some truths are too dangerous to speak, but eyes cannot unsee."
  },
  {
    id: 'cat_common4', name: "Sanctuary Seal", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Choose 1 other Exploited Common Secret you control (on any Mask). Grant it Immunity (Reveal Effects) until your next turn.",
    revealEffect: "The Revealing Player May choose one Exploited Common Secret they control and grant it Immunity (Reveal Effects) until their next turn. You May discard this Secret.",
    flavor: "Within these walls, even the shadows hold their silence."
  },
  {
    id: 'cat_common4_2', name: "Sanctuary Seal", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Choose 1 other Exploited Common Secret you control (on any Mask). Grant it Immunity (Reveal Effects) until your next turn.",
    revealEffect: "The Revealing Player May choose one Exploited Common Secret they control and grant it Immunity (Reveal Effects) until their next turn. You May discard this Secret.",
    flavor: "Within these walls, even the shadows hold their silence."
  },
  {
    id: 'cat_common4_3', name: "Sanctuary Seal", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Choose 1 other Exploited Common Secret you control (on any Mask). Grant it Immunity (Reveal Effects) until your next turn.",
    revealEffect: "The Revealing Player May choose one Exploited Common Secret they control and grant it Immunity (Reveal Effects) until their next turn. You May discard this Secret.",
    flavor: "Within these walls, even the shadows hold their silence."
  },
  {
    id: 'cat_common5', name: "Confession of Secrets", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Choose 2 target Secrets in opponents' hands (can belong to the same or different opponents). Gain Insight on them. You May then choose one of those Secrets and Pay 1 Gold OR Pay 1 Information to Steal that Secret.",
    revealEffect: "Discard this Secret. The Revealing Player Draws 1 Secret from the deck corresponding to the zone your character is in.",
    flavor: "The confessional hides more than sins."
  },
  {
    id: 'cat_common5_2', name: "Confession of Secrets", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Choose 2 target Secrets in opponents' hands (can belong to the same or different opponents). Gain Insight on them. You May then choose one of those Secrets and Pay 1 Gold OR Pay 1 Information to Steal that Secret.",
    revealEffect: "Discard this Secret. The Revealing Player Draws 1 Secret from the deck corresponding to the zone your character is in.",
    flavor: "The confessional hides more than sins."
  },
  {
    id: 'cat_common5_3', name: "Confession of Secrets", zone: "Cathedral", rarity: "Common",
    exploitEffect: "Choose 2 target Secrets in opponents' hands (can belong to the same or different opponents). Gain Insight on them. You May then choose one of those Secrets and Pay 1 Gold OR Pay 1 Information to Steal that Secret.",
    revealEffect: "Discard this Secret. The Revealing Player Draws 1 Secret from the deck corresponding to the zone your character is in.",
    flavor: "The confessional hides more than sins."
  },
  {
    id: 'cat_rare1', name: "The Cardinal\'s Decree", zone: "Cathedral", rarity: "Rare",
    exploitEffect: "If your Trust is the highest among all players (or be tied for the highest). If it is, each other player Loses 1 Trust (they May Pay you 1 Gold OR 1 Information to prevent this loss), if it isn\'t, Gain 2 Trust.",
    revealEffect: "The Revealing Player Must Steal 2 Trust from you.",
    flavor: "His word carries the weight of unquestionable authority."
  },
  {
    id: 'cat_rare1_2', name: "The Cardinal\'s Decree", zone: "Cathedral", rarity: "Rare",
    exploitEffect: "If your Trust is the highest among all players (or be tied for the highest). If it is, each other player Loses 1 Trust (they May Pay you 1 Gold OR 1 Information to prevent this loss), if it isn't, Gain 2 Trust.",
    revealEffect: "The Revealing Player Must Steal 2 Trust from you.",
    flavor: "His word carries the weight of unquestionable authority."
  },
  {
    id: 'cat_rare2', name: "Infiltrator\'s Report", zone: "Cathedral", rarity: "Rare",
    exploitEffect: "Choose one other Secret currently Exploited on the same Mask as this Secret. Copy its Exploitation effect and apply it as if you had Exploited that Secret.",
    revealEffect: "Discard this Secret. The Revealing Player Steals 1 Trust from you. Additionally, the Revealing Player Gains Insight on one Secret in your hand and May Use its Exploitation effect immediately.",
    flavor: "An outsider's eyes see what the familiar overlook."
  },
  {
    id: 'cat_rare2_2', name: "Infiltrator\'s Report", zone: "Cathedral", rarity: "Rare",
    exploitEffect: "Choose one other Secret currently Exploited on the same Mask as this Secret. Copy its Exploitation effect and apply it as if you had Exploited that Secret.",
    revealEffect: "Discard this Secret. The Revealing Player Steals 1 Trust from you. Additionally, the Revealing Player Gains Insight on one Secret in your hand and May Use its Exploitation effect immediately.",
    flavor: "An outsider's eyes see what the familiar overlook."
  },
  {
    id: 'cat_exotic1', name: "Crypt of Promises", zone: "Cathedral", rarity: "Exotic",
    exploitEffect: "Choose up to 2 other Secrets from your hand (respecting the normal Exploit limit of 3 total Secrets per turn, including this one). Instead of Exploiting the chosen Secrets, Discard them. For each Secret discarded this way, Gain 3 Gold and Gain Trust based on its rarity (Common: 1 Trust, Rare: 2 Trust, Exotic: 3 Trust).",
    revealEffect: "The Revealing Player Must Steal 2 Gold and 2 Trust from you. The Revealing Player then Discards this Secret card.",
    flavor: "Buried beneath stone are oaths never meant to be kept."
  }
];

// --- Royal Chamber Cards ---
const royalChamberCards: Omit<SecretCard, 'instanceId'>[] = [
  {
    id: 'rc_common1', name: "The King\'s Secret Keeper", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Pay 2 Gold to choose 1 of your other Exploited Secrets and return it to your hand immediately (this does not count as the Return Exploits phase). Additionally, You May Spend X Secrecy to return this Secret to your hand.",
    revealEffect: "Lose 1 Trust. Discard one other Exploited Secret you control. The Revealing Player May Pay X Secrecy to choose and Keep that Secret.",
    flavor: "A trusted confidant, guarding the kingdom's darkest truths."
  },
  {
    id: 'rc_common1_2', name: "The King\'s Secret Keeper", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Pay 2 Gold to choose 1 of your other Exploited Secrets and return it to your hand immediately (this does not count as the Return Exploits phase). Additionally, You May Spend X Secrecy to return this Secret to your hand.",
    revealEffect: "Lose 1 Trust. Discard one other Exploited Secret you control. The Revealing Player May Pay X Secrecy to choose and Keep that Secret.",
    flavor: "A trusted confidant, guarding the kingdom's darkest truths."
  },
  {
    id: 'rc_common1_3', name: "The King\'s Secret Keeper", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Pay 2 Gold to choose 1 of your other Exploited Secrets and return it to your hand immediately (this does not count as the Return Exploits phase). Additionally, You May Spend X Secrecy to return this Secret to your hand.",
    revealEffect: "Lose 1 Trust. Discard one other Exploited Secret you control. The Revealing Player May Pay X Secrecy to choose and Keep that Secret.",
    flavor: "A trusted confidant, guarding the kingdom's darkest truths."
  },
  {
    id: 'rc_common2', name: "The Crown's Favor", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 2 Gold. If your Gold total is highest among all players (or be tied for the highest), Gain 1 Trust as well. Additionally, if your Trust is 12 or higher, Gain Immunity (Reveal Effects) for one other Common Secret you control until your next turn. Additionally, you May Pay X Secrecy to Gain Immunity (Reveal Effects) for one other Common Secret you control until your next turn.",
    revealEffect: "The Revealing Player Steals this Secret from you. Additionally, the Revealing Player May Pay X Secrecy to Use this Secret.",
    flavor: "A rare privilege granted by the throne, shifting the balance of power."
  },
  {
    id: 'rc_common2_2', name: "The Crown's Favor", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 2 Gold. If your Gold total is highest among all players (or be tied for the highest), Gain 1 Trust as well. Additionally, if your Trust is 12 or higher, Gain Immunity (Reveal Effects) for one other Common Secret you control until your next turn. Additionally, you May Pay X Secrecy to Gain Immunity (Reveal Effects) for one other Common Secret you control until your next turn.",
    revealEffect: "The Revealing Player Steals this Secret from you. Additionally, the Revealing Player May Pay X Secrecy to Use this Secret.",
    flavor: "A rare privilege granted by the throne, shifting the balance of power."
  },
  {
    id: 'rc_common2_3', name: "The Crown's Favor", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 2 Gold. If your Gold total is highest among all players (or be tied for the highest), Gain 1 Trust as well. Additionally, if your Trust is 12 or higher, Gain Immunity (Reveal Effects) for one other Common Secret you control until your next turn. Additionally, you May Pay X Secrecy to Gain Immunity (Reveal Effects) for one other Common Secret you control until your next turn.",
    revealEffect: "The Revealing Player Steals this Secret from you. Additionally, the Revealing Player May Pay X Secrecy to Use this Secret.",
    flavor: "A rare privilege granted by the throne, shifting the balance of power."
  },
  {
    id: 'rc_common3', name: "Whispers in the Court", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 2 Information. You May Pay X Secrecy to Raise Suspicion and then Gain 1 Information for every 2 points of current Suspicion (rounded down).",
    revealEffect: "The Revealing Player Adjusts Suspicion by 2 and Gains 1 Trust. Additionally, the Revealing Player May Pay X Secrecy to Use and Discard this Secret.",
    flavor: "Secrets exchanged in hushed tones, where trust can be both a weapon and a shield."
  },
  {
    id: 'rc_common3_2', name: "Whispers in the Court", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 2 Information. You May Pay X Secrecy to Raise Suspicion and then Gain 1 Information for every 2 points of current Suspicion (rounded down).",
    revealEffect: "The Revealing Player Adjusts Suspicion by 2 and Gains 1 Trust. Additionally, the Revealing Player May Pay X Secrecy to Use and Discard this Secret.",
    flavor: "Secrets exchanged in hushed tones, where trust can be both a weapon and a shield."
  },
  {
    id: 'rc_common3_3', name: "Whispers in the Court", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 2 Information. You May Pay X Secrecy to Raise Suspicion and then Gain 1 Information for every 2 points of current Suspicion (rounded down).",
    revealEffect: "The Revealing Player Adjusts Suspicion by 2 and Gains 1 Trust. Additionally, the Revealing Player May Pay X Secrecy to Use and Discard this Secret.",
    flavor: "Secrets exchanged in hushed tones, where trust can be both a weapon and a shield."
  },
  {
    id: 'rc_common4', name: "Royal Messenger\'s Note", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 1 Secrecy. You May Pay 1 Secrecy to Gain 2 temporary Secrecy which will be lost upon the end of your turn.",
    revealEffect: "The Revealing Player Must Steal 1 Secrecy and the Revealing Player May Pay 1 Secrecy to Discard 1 of your Exploited Secrets.",
    flavor: "A sealed letter that carries weight—whose words could shift the balance of power."
  },
  {
    id: 'rc_common4_2', name: "Royal Messenger\'s Note", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 1 Secrecy. You May Pay 1 Secrecy to Gain 2 temporary Secrecy which will be lost upon the end of your turn.",
    revealEffect: "The Revealing Player Must Steal 1 Secrecy and the Revealing Player May Pay 1 Secrecy to Discard 1 of your Exploited Secrets.",
    flavor: "A sealed letter that carries weight—whose words could shift the balance of power."
  },
  {
    id: 'rc_common4_3', name: "Royal Messenger\'s Note", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Gain 1 Secrecy. You May Pay 1 Secrecy to Gain 2 temporary Secrecy which will be lost upon the end of your turn.",
    revealEffect: "The Revealing Player Must Steal 1 Secrecy and the Revealing Player May Pay 1 Secrecy to Discard 1 of your Exploited Secrets.",
    flavor: "A sealed letter that carries weight—whose words could shift the balance of power."
  },
  {
    id: 'rc_common5', name: "Sovereign\'s Command", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Choose one: Steal 2 Gold and 1 Information from one target player, OR Force one target player to Lose 1 Trust. You May Pay X Secrecy to target all opposing players. (You May choose for each targeted opponent differently)",
    revealEffect: "Discard this Secret. The Revealing Player May Use this Secret.",
    flavor: "A rare and dangerous letter, its words hold the potential to undo alliances and ruin reputations."
  },
  {
    id: 'rc_common5_2', name: "Sovereign\'s Command", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Choose one: Steal 2 Gold and 1 Information from one target player, OR Force one target player to Lose 1 Trust. You May Pay X Secrecy to target all opposing players. (You May choose for each targeted opponent differently)",
    revealEffect: "Discard this Secret. The Revealing Player May Use this Secret.",
    flavor: "A rare and dangerous letter, its words hold the potential to undo alliances and ruin reputations."
  },
  {
    id: 'rc_common5_3', name: "Sovereign\'s Command", zone: "Royal Chamber", rarity: "Common",
    exploitEffect: "Choose one: Steal 2 Gold and 1 Information from one target player, OR Force one target player to Lose 1 Trust. You May Pay X Secrecy to target all opposing players. (You May choose for each targeted opponent differently)",
    revealEffect: "Discard this Secret. The Revealing Player May Use this Secret.",
    flavor: "A rare and dangerous letter, its words hold the potential to undo alliances and ruin reputations."
  },
  {
    id: 'rc_rare1', name: "Crown\'s Hidden Truth", zone: "Royal Chamber", rarity: "Rare",
    exploitEffect: "Choose one: Gain Immunity (Gold Loss), Gain Immunity (Information Loss) or Gain Immunity (Trust Loss) until the next turn. You May Pay X Secrecy to Gain Immunity (X Steal) depending on the already chosen resource.",
    revealEffect: "Discard this Secret. The Revealing Player Must Steal 2 Information and May Raise Suspicion by up to 3. Additionally, the Revealing Player May Pay X Secrecy",
    flavor: "Beneath the gleam of the crown lies a Secret that could shatter thrones."
  },
  {
    id: 'rc_rare1_2', name: "Crown\'s Hidden Truth", zone: "Royal Chamber", rarity: "Rare",
    exploitEffect: "Choose one: Gain Immunity (Gold Loss), Gain Immunity (Information Loss) or Gain Immunity (Trust Loss) until the next turn. You May Pay X Secrecy to Gain Immunity (X Steal) depending on the already chosen resource.",
    revealEffect: "Discard this Secret. The Revealing Player Must Steal 2 Information and May Raise Suspicion by up to 3. Additionally, the Revealing Player May Pay X Secrecy",
    flavor: "Beneath the gleam of the crown lies a Secret that could shatter thrones."
  },
  {
    id: 'rc_rare2', name: "Crown\'s Shadow", zone: "Royal Chamber", rarity: "Rare",
    exploitEffect: "Draw 3 Secrets from any one Zone Deck of your choice. You May immediately Use the Exploitation effect of 1 of those drawn Secrets. Afterward, Discard all 3 drawn Secrets (including the one you Used, if any). You May Pay X Secrecy to Keep the Secret you are going to Use.",
    revealEffect: "Discard this Secret (Crown's Shadow). The Revealing Player Gains this Secret's Exploitation effect, but with a bonus: the specific Secret whose effect they choose to Use is not discarded afterward; instead, they May Keep it. Additionally, the Revealing Player May Pay X Secrecy to Conceal 1 Exploited Secret.",
    flavor: "Loyal to none, seen by none, yet feared by all—the shadow's reach is absolute."
  },
  {
    id: 'rc_rare2_2', name: "Crown\'s Shadow", zone: "Royal Chamber", rarity: "Rare",
    exploitEffect: "Draw 3 Secrets from any one Zone Deck of your choice. You May immediately Use the Exploitation effect of 1 of those drawn Secrets. Afterward, Discard all 3 drawn Secrets (including the one you Used, if any). You May Pay X Secrecy to Keep the Secret you are going to Use.",
    revealEffect: "Discard this Secret (Crown's Shadow). The Revealing Player Gains this Secret's Exploitation effect, but with a bonus: the specific Secret whose effect they choose to Use is not discarded afterward; instead, they May Keep it. Additionally, the Revealing Player May Pay X Secrecy to Conceal 1 Exploited Secret.",
    flavor: "Loyal to none, seen by none, yet feared by all—the shadow's reach is absolute."
  },
  {
    id: 'rc_exotic1', name: "The Queen\'s Trap", zone: "Royal Chamber", rarity: "Exotic",
    exploitEffect: "Placing this Secret onto a Mask slot does not count towards your limit of Secrets Exploited via Mask slots per turn. Pay 2 Secrecy to place this Secret onto one of your Mask slots, underneath any Secret already there (or onto an empty slot). This Secret remains Permanently on the Mask and cannot be returned to hand or discarded by any effect (unless specified otherwise). Win Condition: You win immediately at the start of your turn if this Secret has been successfully Exploited by you for the previous 3 full rounds (total 4 turns including placement) without you being Eliminated.",
    revealEffect: "Lose 3 Trust.",
    flavor: "A cunning move, where loyalty is the bait and ambition the snare."
  }
];


export const mockSecretCards: Omit<SecretCard, 'instanceId'>[] = [
  ...docksAndGatesCards,
  ...easternTownSquareCards,
  ...westernTownSquareCards,
  ...tradingBaileyCards,
  ...courtyardCards,
  ...cathedralCards,
  ...royalChamberCards,
];

export const mockVictoryConditions: VictoryCondition[] = [
  { id: 'vc1', name: 'Architect of Chaos', description: 'You win immediately if during your turn, you have Successfully Revealed 2 Secrets or more, AND the current Suspicion is 10 or higher.', isAchieved: (gs, pid) => gs.suspicion >= 10 && (gs.players.find(p=>p.id === pid)?.secrecy || 0) >=3 },
  { id: 'vc2', name: 'Diplomatic Victory', description: 'You win immediately if during your turn you achieve a state where Suspicion is 2 or lower, your Trust is 15 or higher, AND you have the highest Trust among all players (or are tied for the highest).', isAchieved: (gs, pid) => {
    const p = gs.players.find(pl=>pl.id === pid);
    if(!p) return false;
    return gs.suspicion <= 2 && p.trust >= 15 && gs.players.every(op => op.id === pid || p.trust >= op.trust);
  }},
  { id: 'vc3', name: 'Information Broker', description: 'You win immediately if at the End of your Turn you possess 9 Information, AND you have Successfully Revealed at least 2 Secrets during this turn.', isAchieved: (gs, pid) => (gs.players.find(p=>p.id === pid)?.gold || 0) >= 15 },
  { id: 'vc4', name: 'King\'s Favourite', description: 'You win immediately if during your turn your Trust > 16 AND Trust is higher than the average Trust score of the other two players by at least 5 points.', isAchieved: () => false },
  { id: 'vc5', name: 'Master Manipulator', description: '(Condition 1) Special: If an opponent fulfills the condition to win by Exploiting The Queen’s Trap on their turn, you may immediately reveal this Victory Condition. If you do, you win the game instead of them.\n(Condition 2) Special: You win immediately if an opponent Reveals one of your Masks, and another opponent\'s Secret on that Mask triggers a Reveal Effect which causes that opponent\'s (the Secret\'s owner) elimination because their Trust becomes ≤ Suspicion (either via direct Trust loss or Suspicion raised by the effect). (You must reveal this Victory Condition immediately after effects resolve).\n(Condition 3) Condition: You win immediately at the start of your turn if The Queen’s Trap has been successfully Exploited by you for the previous 1 full rounds (total 2 turns including placement) without you being Eliminated.', isAchieved: () => false },
  { id: 'vc6', name: 'Mastermind', description: 'You win immediately if during your Return Exploits phase you return 1 Exotic Secret AND 1 Rare Secret to your hand that were not Successfully targeted by a Reveal action during the previous round.', isAchieved: () => false },
  { id: 'vc7', name: 'Masterstroke Turn', description: 'You win immediately if during your turn you Successfully gain the Exploitation Effect from at least four different Secret cards, including at least one Common, one Rare, AND one Exotic Secret.', isAchieved: () => false },
  { id: 'vc8', name: 'Resourceful Turnabout', description: 'You win immediately if during your turn the cumulative gains from Secret Exploit and/or Reveal effects activated during this turn reach 5 or more Trust AND 5 or more Gold.', isAchieved: () => false },
  { id: 'vc9', name: 'Secret Betrayal', description: 'You win immediately if during your turn, your action directly causes an opponent\'s elimination by ensuring their Trust is ≤ Suspicion, either by reducing their Trust or by Raising Suspicion and your Trust must be lower than the Trust of the eliminated opponent before your action resolved', isAchieved: () => false },
  { id: 'vc10', name: 'Secrecy Hoarder', description: 'You win immediately if during your turn, after resolving your Exploits, you possess 6 or more Secrecy AND have 3 Royal Chamber Secrets currently Exploited.', isAchieved: () => false },
  { id: 'vc11', name: 'Shadow Master', description: 'You win immediately if during your Return Exploits phase, none of your Exploited Secrets from the previous round were Successfully Revealed, AND the current Suspicion level is 9 or higher.', isAchieved: () => false },
  { id: 'vc12', name: 'The Financier', description: 'You win immediately if during your turn, upon gaining Gold from the Exploit effect of your 3rd (or subsequent) different Secret this turn, you possess 17 or more Gold.', isAchieved: () => false },
  { id: 'vc13', name: 'The Great Heist', description: 'You win immediately if during your turn you perform an action that involves Stealing Gold, Information, or Trust, AND at that moment you possess 10 or more Gold, 6 or more Information, and the current Suspicion is 5 or lower. (Without Information Steal)', isAchieved: () => false },
  { id: 'vc14', name: 'The Survivor', description: 'Condition: You win immediately if at the End of your Turn, Trust > Suspicion (min 6), AND you started this turn with Trust ≤ Suspicion.\nResilience (Passive): If your Trust drops to ≤ Suspicion (min 6), gain temporary Immunity to elimination via Trust vs. Suspicion (including from other VCs). Other players cannot declare victory during your Resilience Period.\n(If triggered on your turn: Immunity lasts until End of this Turn.)\n(If triggered outside your turn: Immunity lasts until End of your next Turn.)\nResolution: You Must raise Trust > Suspicion by the end of the Resilience Period to avoid elimination. If you survive and meet the primary Condition at the End of your Turn, you win immediately. If you are eliminated, other pending wins may proceed.', isAchieved: () => false },
  { id: 'vc15', name: 'Total Domination', description: 'You win immediately if during your turn you possess (in hand or Exploited) the required Secret (or Rare/Exotic substitute) from each specified zone simultaneously:\nDocks and Gates: Smuggler\'s Network\nTown Squares: City Watch\nTrading Bailey: Customs Inspection\nCourtyard: Hidden Pact\nCathedral: Sanctuary Seal\nRoyal Chamber: Sovereign’s Command', isAchieved: () => false },
  { id: 'vc16', name: 'Underdog Victory', description: 'You win immediately if during your turn, you choose to use this card\'s ability to Raise Suspicion by 2, and doing so causes all players currently in the game (potentially including yourself) to have their Trust equal to or lower than the new Suspicion level.', isAchieved: () => false },
  { id: 'vc17', name: 'War Planner', description: 'You win immediately if during your turn, after resolving your Exploits, you have Exploited 3 Secrets (at least one Rare or Exotic) during this turn AND possess 10 or more Secret cards in your hand.', isAchieved: () => false },
  { id: 'vc18', name: 'Zonal Supremacy', description: 'You win immediately if during your turn you possess the highest number of Secrets from all zones (in hand or Exploited), or are tied for the highest.', isAchieved: () => false },
];

export const mockEventCards: EventCard[] = [
  { id: 'ev1', name: 'The Last Confession', description: 'If a Secret is targeted by a Reveal action this round, it is discarded (returned to the bottom of its Zone Deck) immediately after its Reveal Effect resolves.' },
  { id: 'ev2', name: 'Distraction', description: 'When a Secret is Exploited return it to the hand. (A Mask cannot Exploit more than one Secret in a turn)' },
  { id: 'ev3', name: 'Royal Protection', description: 'Players Gain Immunity (Gold Loss) and Immunity (Gold Steal) this round.'},
  { id: 'ev4', name: 'Whispers Amplified', description: 'For this round, the first Reveal action taken by each player costs only 1 Information. Any subsequent Reveal actions taken by any player this round cost 2 Information (instead of the standard 3).' },
  { id: 'ev5', name: 'False Allegations', description: 'Discard any number of Secrets from your hand. For each Secret discarded, draw 1 Secret (and add it to your hand) from any Zone Deck(s) of your choice (excluding the Royal Chamber Zone Deck).' },
  { id: 'ev6', name: 'Blackmail', description: 'Each player Must Pay 1 Gold per Secret currently in their hand. If unable to Pay the full amount, they Must discard Secrets (of their choice) until they can afford to Pay 1 Gold for each remaining Secret.' },
  { id: 'ev7', name: 'Courtly Feast', description: 'Each player May choose to Gain 3 Gold or 1 Trust. Players Must choose one.' },
  { id: 'ev8', name: 'Foreign Envoys', description: 'Draw an additional Victory Condition card. You now have two Victory Conditions; fulfilling either wins you the game (following standard precedence rules).' },
  { id: 'ev9', name: 'Signs of Intrusion', description: 'If you currently have two Victory Conditions, you Must choose and discard one.' },
  { id: 'ev10', name: 'Another Mask', description: 'For this round, each player May Exploit a Secret in the temporary Eclipse Mask slot in addition to their normal limit of 3 Exploited Secrets (using Lunar, Solar, Shadow Masks). This allows a potential total of 4 Exploited Secrets this round if the Eclipse Mask slot is used. The Eclipse Mask functions like a standard Mask and can be targeted by Reveal actions.' },
];

export function getRandomVictoryConditions(allVCs: Omit<VictoryCondition, 'isAchieved'>[], count: number): Omit<VictoryCondition, 'isAchieved'>[] {
  const shuffled = shuffleArray([...allVCs]);
  return shuffled.slice(0, count);
}
