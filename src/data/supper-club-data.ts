export interface Badge {
  id: string;
  symbol: string;
  name: string;
  desc: string;
  earned: boolean;
}

export interface Member {
  name: string;
  avatar: string;
  color: string;
}

export interface Group {
  id: number;
  name: string;
  code: string;
  members: number;
  city: string;
  dinnerStatus: "scheduled" | "pending_confirm" | "no_date" | "awaiting_host" | "pending_restaurant" | "post_dinner" | "awaiting_next_host";
  nextDinner: string | null;
  pendingDate: string | null;
}

export interface MemberAvailability {
  [memberName: string]: string[];
}

export const MAX_GROUP_MEMBERS = 6;

export const WITTY_HOST_WAITING = [
  "All dates are in. The host is currently... considering their options. Very carefully.",
  "Everyone's submitted. The host appears to be consulting their personal astrologer.",
  "Dates in. Host's decision pending. Perhaps they're building suspense. Or just busy.",
  "The group has spoken. Now we wait for the host to grace us with a decision.",
  "All availability submitted. The host is taking their sacred duty very seriously.",
];

export interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  suggested_by?: string;
  city: string;
  price: number;
  visited: boolean;
  visitedDate: string | null;
  visitedRating: number | null;
  googleRating?: number | null;
  googleReviewCount?: number;
  scRating?: number | null;
  scReviewCount?: number;
}

export interface PublicReview {
  group: string;
  restaurant: string;
  rating: number;
  review: string;
  city: string;
  date: string;
}

export const INDIVIDUAL_BADGES: Badge[] = [
  { id:"i1",  symbol:"I",     name:"First Supper",        desc:"Attended your first club dinner",                earned:true  },
  { id:"i2",  symbol:"II",    name:"Critic's Eye",         desc:"Submitted 5 detailed reviews",                  earned:true  },
  { id:"i3",  symbol:"III",   name:"Connoisseur",          desc:"Dined at 10 different restaurants",             earned:false },
  { id:"i4",  symbol:"IV",    name:"On a Roll",            desc:"Attended 5 dinners in a row",                   earned:false },
  { id:"i5",  symbol:"V",     name:"Food Photographer",    desc:"Submitted 10 food photos",                      earned:true  },
  { id:"i6",  symbol:"VI",    name:"Out of State",         desc:"Dined at a restaurant out of state",            earned:false },
  { id:"i7",  symbol:"VII",   name:"Explorer",             desc:"Visited 5 different cuisines",                  earned:false },
  { id:"i8",  symbol:"VIII",  name:"Best Dish",            desc:"Voted best dish of the evening",                earned:true  },
  { id:"i9",  symbol:"IX",    name:"Top Palate",           desc:"Won best dish 3 times",                         earned:false },
  { id:"i10", symbol:"X",     name:"Club Legend",           desc:"Attended 20 club dinners across all groups",   earned:false },
  { id:"i11", symbol:"XI",    name:"Night Owl",             desc:"Attended a dinner that lasted past midnight",  earned:false },
  { id:"i12", symbol:"XII",   name:"Globe Trotter",         desc:"Dined at 10 different cuisine categories",     earned:false },
  { id:"i13", symbol:"XIII",  name:"Sommelier",             desc:"Recommended the wine 3 times",                 earned:false },
  { id:"i14", symbol:"XIV",   name:"The Regular",           desc:"Returned to the same restaurant 3 times",      earned:false },
  { id:"i15", symbol:"XV",    name:"Early Bird",            desc:"Always the first to submit availability",      earned:true  },
  { id:"i16", symbol:"XVI",   name:"The Wordsmith",         desc:"Wrote a review over 200 words",                earned:false },
  { id:"i17", symbol:"XVII",  name:"Streak Master",         desc:"Attended 10 dinners in a row",                 earned:false },
  { id:"i18", symbol:"XVIII", name:"Five-Star Giver",       desc:"Gave a perfect 5-star rating",                 earned:true  },
  { id:"i19", symbol:"XIX",   name:"The Skeptic",           desc:"Gave a 1 or 2-star rating",                    earned:false },
  { id:"i20", symbol:"XX",    name:"Centurion",             desc:"Attended 100 club dinners total",              earned:false },
];

export const GROUP_BADGES: Badge[] = [
  { id:"g1",  symbol:"I",     name:"Founding Circle",      desc:"Original members of this group",                earned:true  },
  { id:"g2",  symbol:"II",    name:"First Year",            desc:"Group has dined together for one full year",   earned:false },
  { id:"g3",  symbol:"III",   name:"No Repeats",            desc:"Visited 10 restaurants with no repeats",       earned:false },
  { id:"g4",  symbol:"IV",    name:"Around the World",      desc:"Dined in 5 different cuisine categories",      earned:true  },
  { id:"g5",  symbol:"V",     name:"Out of Town",           desc:"Traveled out of state for a dinner",           earned:false },
  { id:"g6",  symbol:"VI",    name:"Perfect Score",         desc:"Gave a restaurant a unanimous 5-rating",       earned:false },
  { id:"g7",  symbol:"VII",   name:"Loyal Crew",            desc:"Same members for 10 dinners in a row",         earned:true  },
  { id:"g8",  symbol:"VIII",  name:"The Grand Tour",        desc:"Dined at 50 restaurants as a group",           earned:false },
  { id:"g9",  symbol:"IX",    name:"Full House",             desc:"Every member confirmed within 1 hour",        earned:false },
  { id:"g10", symbol:"X",     name:"Price is Right",         desc:"Tried all 4 price tiers as a group",          earned:false },
  { id:"g11", symbol:"XI",    name:"Double Digits",          desc:"Completed 10 group dinners",                  earned:false },
  { id:"g12", symbol:"XII",   name:"The Tradition",          desc:"Dined together for 2 full years",             earned:false },
  { id:"g13", symbol:"XIII",  name:"Consensus",              desc:"All members gave the same rating",            earned:false },
  { id:"g14", symbol:"XIV",   name:"Squad Goals",            desc:"Group grew to 8 or more members",             earned:false },
  { id:"g15", symbol:"XV",    name:"Marathon",               desc:"Completed 25 group dinners",                  earned:false },
];

export const MEMBERS: Member[] = [
  { name:"Marisol", avatar:"M", color:"#c9956a" },
  { name:"Derek",   avatar:"D", color:"#7a9e7e" },
  { name:"Priya",   avatar:"P", color:"#9b7ec8" },
  { name:"You",     avatar:"Y", color:"#c45c5c" },
];

export const INITIAL_GROUPS: Group[] = [
  { id:1, name:"The Golden Table",    code:"SUPR-4829", members:4, city:"New York, NY", dinnerStatus:"scheduled",       nextDinner:"March 18, 2026", pendingDate:null },
  { id:2, name:"Weeknight Wanderers", code:"SUPR-7741", members:3, city:"New York, NY", dinnerStatus:"pending_confirm", nextDinner:null,             pendingDate:"April 4, 2026" },
];

export const RESTAURANT_POOL: Restaurant[] = [
  { id:1, name:"Osteria Morini", cuisine:"Italian",  suggested_by:"Marisol", city:"New York, NY", price:3, visited:false, visitedDate:null, visitedRating:null, googleRating:4.6, googleReviewCount:2840, scRating:null, scReviewCount:0 },
  { id:2, name:"Nobu",           cuisine:"Japanese", suggested_by:"Derek",   city:"New York, NY", price:4, visited:false, visitedDate:null, visitedRating:null, googleRating:4.4, googleReviewCount:5120, scRating:4.8, scReviewCount:12 },
  { id:3, name:"Le Bernardin",   cuisine:"French",   suggested_by:"Priya",   city:"New York, NY", price:4, visited:false, visitedDate:null, visitedRating:null, googleRating:4.7, googleReviewCount:3400, scRating:4.5, scReviewCount:7 },
  { id:4, name:"Cosme",          cuisine:"Mexican",  suggested_by:"You",     city:"New York, NY", price:3, visited:false, visitedDate:null, visitedRating:null, googleRating:4.3, googleReviewCount:1980, scRating:null, scReviewCount:0 },
];

export const PREVIOUSLY_VISITED: Restaurant[] = [
  { id:10, name:"Eleven Madison Park", cuisine:"American", city:"New York, NY", price:4, visited:true, visitedDate:"Feb 8, 2026",  visitedRating:4.8, googleRating:4.8, googleReviewCount:6200, scRating:4.8, scReviewCount:16 },
  { id:11, name:"Carbone",             cuisine:"Italian",  city:"New York, NY", price:3, visited:true, visitedDate:"Jan 18, 2026", visitedRating:4.5, googleRating:4.5, googleReviewCount:4100, scRating:4.3, scReviewCount:10 },
  { id:12, name:"Atomix",              cuisine:"Korean",   city:"New York, NY", price:4, visited:true, visitedDate:"Dec 3, 2025",  visitedRating:4.2, googleRating:4.9, googleReviewCount:890,  scRating:null, scReviewCount:5 },
];

export const PUBLIC_REVIEWS: PublicReview[] = [
  { group:"The Velvet Fork",   restaurant:"Osteria Morini", rating:4.9, review:"Transcendent pasta. We argued about who got the last piece of bread. Derek lost.",        city:"New York, NY", date:"Feb 2026" },
  { group:"Tuesday Table",     restaurant:"Osteria Morini", rating:4.6, review:"Perfectly charming. The sommelier remembered us from last time. Unsettling. Wonderful.", city:"New York, NY", date:"Jan 2026" },
  { group:"The Midnight Fork", restaurant:"Le Bernardin",   rating:5.0, review:"Flawless. We gave it a perfect score and immediately questioned our life choices.",      city:"New York, NY", date:"Mar 2026" },
  { group:"Six at the Table",  restaurant:"Nobu",           rating:4.7, review:"The omakase was extraordinary. One member cried. We don't talk about it.",               city:"New York, NY", date:"Feb 2026" },
];

export const WITTY_NO_DATE = [
  "No dinner on the books. Apparently everyone is very busy, or very indecisive. Possibly both.",
  "The calendar is empty. The reservation system is waiting. Your group is not.",
  "No date set yet. The restaurants of New York remain blissfully unaware of your existence.",
  "Still no date. History will note that this group had excellent taste and terrible urgency.",
  "The dining gods grow impatient. Someone should really pick a date.",
];

export const SECRET_HOST_MESSAGES = [
  "You've been chosen. The torch has been passed in absolute secrecy.",
  "Psst... you're the new keeper of the dinner secrets.",
  "The Supper Club Social has spoken. You are the chosen one.",
  "A new host emerges from the shadows. It's you.",
  "Congratulations, secret agent. Your mission: plan the next feast.",
  "The keys to the kingdom are now yours. Guard them wisely.",
  "Under cover of night, you've been selected. Tell no one.",
  "The curtain rises. You're the star of the next dinner show.",
];

export const HOST_PRIVILEGE_MESSAGES = [
  "Only you know where the group is going. Savor this power.",
  "The group trusts you with their taste buds. Don't let them down.",
  "You hold the secret. They can only wonder and speculate.",
  "Guard this intel like your most prized recipe.",
  "With great hosting comes great responsibility.",
];

export const WITTY_INITIATION_MESSAGES = [
  "You've joined mid-feast. The table is set, but your seat awaits the next round.",
  "Welcome, newcomer. The current dinner is spoken for — your initiation begins after.",
  "The group is mid-adventure. Patience. Your turn at the table is coming.",
  "A new face! Unfortunately, this dinner's already in motion. Your time will come.",
  "You've arrived fashionably late. The next supper is when your journey truly begins.",
  "The reservation is locked. Consider this your appetizer course — just watching.",
  "Your membership is pending initiation. Think of it as... anticipation seasoning.",
  "Welcome to the waiting list that actually means something. See you after dinner.",
];

export const WITTY_SKIP_MESSAGES = [
  "Not this one. The universe has other plans.",
  "Skipped. Even restaurants have bad timing.",
  "Moving on. Some secrets weren't meant to be.",
  "Next. That one didn't spark joy.",
  "Passed. The cards have been reshuffled.",
  "Onwards. Better options await.",
  "Declined. Trust the process.",
  "Not tonight. The stars weren't aligned.",
];

export const WITTY_AWAITING_HOST = [
  "The torch has been passed. But to whom? Even the shadows don't know yet.",
  "Someone among you has been chosen. They just don't know it yet. Neither do you.",
  "A new host stirs in the darkness. All will be revealed at dawn.",
  "The selection has been made. The universe is processing. Check back at 8 AM.",
  "One of you holds the power now. But the envelope remains sealed until morning.",
  "The dice have been cast. The fates have decided. But they're not telling until 8 AM.",
  "Somewhere, a host has been chosen. They're probably sleeping. Blissfully unaware.",
  "The next chapter begins at sunrise. Until then... suspense.",
  "A secret has been planted. It blooms at 8 AM tomorrow.",
  "The gods of dining have spoken. Their decree arrives with the morning light.",
];

export const MEAL_TYPES = ["Breakfast","Brunch","Lunch","Dinner"];
export const PRICE_LABELS: Record<number, string> = { 1:"$", 2:"$$", 3:"$$$", 4:"$$$$" };

export const getRatingInfo = (r: Restaurant) => {
  if ((r.scReviewCount ?? 0) >= 10 && r.scRating != null) {
    return { rating: r.scRating, source: "SC" as const, color: "#c9956a", tip: "Supper Club rating — based on member reviews" };
  }
  if (r.googleRating != null) {
    return { rating: r.googleRating, source: "G" as const, color: "#7a9e7e", tip: `Google rating · ${r.scReviewCount || 0} Supper Club review${r.scReviewCount !== 1 ? "s" : ""} so far (10 needed to switch)` };
  }
  return null;
};
