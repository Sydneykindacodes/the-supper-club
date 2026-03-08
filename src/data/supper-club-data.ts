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
  dinnerStatus: "scheduled" | "pending_confirm" | "no_date";
  nextDinner: string | null;
  pendingDate: string | null;
}

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
  { id:"i1",  symbol:"I",    name:"First Supper",      desc:"Attended your first club dinner",             earned:true  },
  { id:"i2",  symbol:"II",   name:"Critic's Eye",       desc:"Submitted 5 detailed reviews",               earned:true  },
  { id:"i3",  symbol:"III",  name:"Connoisseur",        desc:"Dined at 10 different restaurants",          earned:false },
  { id:"i4",  symbol:"IV",   name:"On a Roll",          desc:"Attended 5 dinners in a row",                earned:false },
  { id:"i5",  symbol:"V",    name:"Food Photographer",  desc:"Submitted 10 food photos",                   earned:true  },
  { id:"i6",  symbol:"VI",   name:"Out of State",       desc:"Dined at a restaurant out of state",         earned:false },
  { id:"i7",  symbol:"VII",  name:"Explorer",           desc:"Visited 5 different cuisines",               earned:false },
  { id:"i8",  symbol:"VIII", name:"Best Dish",          desc:"Voted best dish of the evening",             earned:true  },
  { id:"i9",  symbol:"IX",   name:"Top Palate",         desc:"Won best dish 3 times",                      earned:false },
  { id:"i10", symbol:"X",    name:"Club Legend",        desc:"Attended 20 club dinners across all groups", earned:false },
];

export const GROUP_BADGES: Badge[] = [
  { id:"g1", symbol:"I",    name:"Founding Circle",  desc:"Original members of this group",             earned:true  },
  { id:"g2", symbol:"II",   name:"First Year",       desc:"Group has dined together for one full year", earned:false },
  { id:"g3", symbol:"III",  name:"No Repeats",       desc:"Visited 10 restaurants with no repeats",    earned:false },
  { id:"g4", symbol:"IV",   name:"Around the World", desc:"Dined in 5 different cuisine categories",   earned:true  },
  { id:"g5", symbol:"V",    name:"Out of Town",      desc:"Traveled out of state for a dinner",        earned:false },
  { id:"g6", symbol:"VI",   name:"Perfect Score",    desc:"Gave a restaurant a unanimous 5-rating",    earned:false },
  { id:"g7", symbol:"VII",  name:"Loyal Crew",       desc:"Same members for 10 dinners in a row",      earned:true  },
  { id:"g8", symbol:"VIII", name:"The Grand Tour",   desc:"Dined at 50 restaurants as a group",        earned:false },
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
