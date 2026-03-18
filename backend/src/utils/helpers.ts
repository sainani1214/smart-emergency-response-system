/**
 * Utility function to calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate ETA based on distance
 * Assumes average speed of 60 km/h in emergency conditions
 */
export function calculateETA(distanceKm: number): number {
  const averageSpeedKmh = 60; // Emergency vehicle average speed
  const etaMinutes = (distanceKm / averageSpeedKmh) * 60;
  return Math.ceil(etaMinutes);
}

/**
 * Generate unique ID with prefix
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

/**
 * Calculate priority score for an incident
 * Higher score = higher priority
 */
export function calculatePriorityScore(
  severity: string,
  type: string,
  escalationLevel: number
): number {
  const severityScores: Record<string, number> = {
    low: 10,
    medium: 25,
    high: 50,
    critical: 100
  };

  const typeMultipliers: Record<string, number> = {
    medical: 1.5,
    fire: 1.8,
    security: 1.0,
    water: 0.8,
    power: 0.7
  };

  const baseScore = severityScores[severity] || 10;
  const typeMultiplier = typeMultipliers[type] || 1.0;
  const escalationBonus = escalationLevel * 15;

  return Math.round(baseScore * typeMultiplier + escalationBonus);
}

/**
 * Normalize a value between 0 and 1
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Check if a time threshold has passed
 */
export function hasTimeElapsed(startTime: Date, thresholdMinutes: number): boolean {
  const now = new Date();
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / 60000;
  return elapsedMinutes >= thresholdMinutes;
}
