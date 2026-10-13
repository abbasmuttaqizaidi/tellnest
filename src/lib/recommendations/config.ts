/**
 * Configuration for "For You" personalized recommendations.
 * 
 * NOTE: All numerical weights and behavioral thresholds in this file
 * are provisional defaults and NOT finalized product decisions.
 * They are intentionally centralized here so they can be re-calibrated
 * or made dynamic without altering recommendation engine logic.
 */

export interface ForYouWeights {
  /**
   * Provisional score added when story matches the reader's active reading genre
   * (demonstrated by repeated active reading behavior over the lookback window).
   */
  ACTIVE_READING_GENRE_AFFINITY: number

  /**
   * Provisional score added when story matches the reader's declared onboarding genres.
   */
  ONBOARDING_GENRE_MATCH: number

  /**
   * Provisional score added when story matches the reader's declared onboarding categories.
   */
  ONBOARDING_CATEGORY_MATCH: number

  /**
   * Provisional bonus for living active serials with new chapters published recently.
   */
  RECENT_CHAPTER_DROP_BONUS: number

  /**
   * Provisional engagement bonus for stories with healthy organic read activity.
   */
  ORGANIC_ENGAGEMENT_BONUS: number
}

export interface ForYouConfig {
  /** Maximum number of recommendations to return (strictly <= 10). */
  MAX_RECOMMENDATIONS: number

  /** Lookback window in days for aggregating active reading history. */
  LOOKBACK_DAYS: number

  /**
   * Minimum active reading duration (in seconds) required in a genre
   * before that genre is considered a candidate for taste shift.
   * Prevents brief skimming or clicks from overriding reader preferences.
   */
  MIN_ACTIVE_SECONDS_FOR_TASTE_SHIFT: number

  /**
   * Minimum number of distinct reading sessions required in a genre
   * before that genre can override onboarding preferences.
   */
  MIN_SESSIONS_FOR_TASTE_SHIFT: number

  /**
   * Configurable scoring weights.
   */
  WEIGHTS: ForYouWeights
}

export const FOR_YOU_CONFIG: ForYouConfig = {
  MAX_RECOMMENDATIONS: 10,
  LOOKBACK_DAYS: 14,
  MIN_ACTIVE_SECONDS_FOR_TASTE_SHIFT: 90,
  MIN_SESSIONS_FOR_TASTE_SHIFT: 2,
  WEIGHTS: {
    ACTIVE_READING_GENRE_AFFINITY: 40,
    ONBOARDING_GENRE_MATCH: 25,
    ONBOARDING_CATEGORY_MATCH: 15,
    RECENT_CHAPTER_DROP_BONUS: 10,
    ORGANIC_ENGAGEMENT_BONUS: 10,
  },
}
