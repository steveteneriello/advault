/**
 * Validate an email address
 * @param email - The email address to validate
 * @returns Whether the email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a URL
 * @param url - The URL to validate
 * @returns Whether the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Normalize a URL by adding https:// if missing
 * @param url - The URL to normalize
 * @returns The normalized URL
 */
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Validate a search query
 * @param query - The search query to validate
 * @returns Whether the query is valid
 */
export function isValidSearchQuery(query: string): boolean {
  return query.trim().length > 0;
}

/**
 * Validate a location string
 * @param location - The location to validate
 * @returns Whether the location is valid
 */
export function isValidLocation(location: string): boolean {
  return location.trim().length > 0;
}