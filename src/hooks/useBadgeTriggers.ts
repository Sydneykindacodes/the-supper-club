import { useEffect, useRef } from "react";
import type { DBReview, DBBadge } from "./useSupperClubData";

/**
 * Automatically awards badges based on user activity.
 * Call earnBadge with badge_key and type when criteria is met.
 */
export function useBadgeTriggers(
  reviews: DBReview[],
  userBadges: DBBadge[],
  userId: string,
  hostCount: number,
  earnBadge: (key: string, type?: string) => Promise<void>,
  activeGroupId: string | null
) {
  const triggeredRef = useRef(new Set<string>());

  useEffect(() => {
    const earned = new Set(userBadges.map(b => b.badge_key));
    const myReviews = reviews.filter(r => r.user_id === userId);
    const myPhotos = myReviews.filter(r => r.photo_url);

    const tryEarn = (key: string, type: string = "individual") => {
      if (!earned.has(key) && !triggeredRef.current.has(key)) {
        triggeredRef.current.add(key);
        earnBadge(key, type);
      }
    };

    // First review
    if (myReviews.length >= 1) tryEarn("first_review");
    // 5 reviews
    if (myReviews.length >= 5) tryEarn("five_reviews");
    // First photo
    if (myPhotos.length >= 1) tryEarn("first_photo");
    // 10 photos
    if (myPhotos.length >= 10) tryEarn("ten_photos");
    // First host - awarded when user has actually hosted at least one dinner
    if (hostCount >= 1) tryEarn("first_host");
    // Three hosts
    if (hostCount >= 3) tryEarn("three_hosts");
    // Best dish vote (if someone voted for you)
    const bestDishVotes = reviews.filter(r => r.best_dish_member === "You" || r.best_dish_member === userId);
    if (bestDishVotes.length >= 1) tryEarn("best_dish");
    if (bestDishVotes.length >= 3) tryEarn("three_best_dish");

    // Group badges
    if (activeGroupId) {
      const groupReviews = reviews.filter(r => r.group_id === activeGroupId);
      if (groupReviews.length >= 1) tryEarn("group_first_dinner", "group");
      if (groupReviews.length >= 5) tryEarn("group_five_dinners", "group");
      if (groupReviews.length >= 10) tryEarn("group_ten_dinners", "group");
      
      const groupCuisines = new Set(groupReviews.map(r => r.cuisine).filter(Boolean));
      if (groupCuisines.size >= 5) tryEarn("group_five_cuisines", "group");
    }
  }, [reviews.length, userBadges.length, userId, isHost, activeGroupId]);
}