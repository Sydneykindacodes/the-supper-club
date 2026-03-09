// Simple SVG path icons rendered as white graphics
// Each symbol is a tiny inline SVG string for a clean monoline look

const svg = (path: string, vb = "0 0 24 24") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

export const BADGE_ICONS: Record<string, string> = {
  // Individual
  first_supper:    svg('<path d="M3 11h18M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><path d="M12 11v6"/><path d="M8 20h8"/>'),
  first_review:    svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  five_reviews:    svg('<path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h6"/><path d="M8 16h4"/>'),
  ten_restaurants: svg('<circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M12 4V2"/>'),
  five_streak:     svg('<path d="M12 2c1 4-2 6-2 10a4 4 0 0 0 8 0c0-4-3-6-2-10"/><path d="M10 18a2 2 0 0 0 4 0"/>'),
  first_photo:     svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M3 8h2l1-2h12l1 2h2"/>'),
  ten_photos:      svg('<rect x="2" y="6" width="16" height="12" rx="1"/><rect x="6" y="4" width="16" height="12" rx="1"/><circle cx="14" cy="10" r="2.5"/>'),
  first_host:      svg('<path d="M3 20l3-8h12l3 8"/><circle cx="12" cy="8" r="4"/>'),
  three_hosts:     svg('<path d="M12 2l2 5h5l-4 3.5 1.5 5L12 13l-4.5 2.5L9 10.5 5 7h5Z"/>'),
  best_dish:       svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
  three_best_dish: svg('<path d="M6 9a6 6 0 0 1 12 0c0 4-6 9-6 9S6 13 6 9Z"/><circle cx="12" cy="9" r="2"/>'),
  early_bird:      svg('<circle cx="12" cy="8" r="3"/><path d="M12 11v4"/><path d="M9 22h6"/><path d="M8 15h8"/><path d="M5 5l2 2"/><path d="M19 5l-2 2"/>'),

  // Group
  group_first_dinner: svg('<path d="M8 2v4"/><path d="M16 2v4"/><path d="M12 11v6"/><path d="M9 20h6"/><path d="M8 6h8l1 5H7Z"/>'),
  group_five_dinners: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/><circle cx="12" cy="15" r="1.5"/>'),
  group_ten_dinners:  svg('<path d="M4 20V8l8-6 8 6v12"/><path d="M9 20v-6h6v6"/><path d="M4 10h16"/>'),
  group_five_cuisines:svg('<circle cx="12" cy="12" r="9"/><path d="M2 12h20"/><ellipse cx="12" cy="12" rx="4" ry="9"/>'),
  group_full_attendance: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  group_all_reviewed: svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
};

export const INDIVIDUAL_BADGE_DEFS = [
  { key: "first_supper", name: "First Supper", desc: "Attended your first club dinner" },
  { key: "first_review", name: "Critic's Eye", desc: "Submitted your first review" },
  { key: "five_reviews", name: "Seasoned Critic", desc: "Submitted 5 detailed reviews" },
  { key: "ten_restaurants", name: "Connoisseur", desc: "Dined at 10 different restaurants" },
  { key: "five_streak", name: "On a Roll", desc: "Attended 5 dinners in a row" },
  { key: "first_photo", name: "Food Photographer", desc: "Submitted your first food photo" },
  { key: "ten_photos", name: "Gallery Curator", desc: "Submitted 10 food photos" },
  { key: "first_host", name: "Host Debut", desc: "Hosted your first dinner" },
  { key: "three_hosts", name: "Seasoned Host", desc: "Hosted 3 dinners" },
  { key: "best_dish", name: "Best Dish", desc: "Voted best dish of the evening" },
  { key: "three_best_dish", name: "Top Palate", desc: "Won best dish 3 times" },
  { key: "early_bird", name: "Early Bird", desc: "First to submit availability" },
];

export const GROUP_BADGE_DEFS = [
  { key: "group_first_dinner", name: "Inaugural Supper", desc: "Completed your group's first dinner" },
  { key: "group_five_dinners", name: "Regulars", desc: "Completed 5 group dinners" },
  { key: "group_ten_dinners", name: "Institution", desc: "Completed 10 group dinners" },
  { key: "group_five_cuisines", name: "World Tour", desc: "Visited 5 different cuisines as a group" },
  { key: "group_full_attendance", name: "Full House", desc: "Full attendance at a dinner" },
  { key: "group_all_reviewed", name: "Critics Circle", desc: "Every member reviewed the same dinner" },
];
