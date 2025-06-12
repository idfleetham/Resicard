import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  } else if (diffDays === 0) {
    return 'Expires today';
  } else if (diffDays === 1) {
    return 'Expires tomorrow';
  } else {
    return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }
}

export function calculateDiscountPercentage(original: number, discounted: number): number {
  return Math.round(((original - discounted) / original) * 100);
}

export function validatePostcode(postcode: string): boolean {
  // UK postcode regex pattern
  const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
  
  if (!postcodeRegex.test(postcode)) {
    return false;
  }

  // Check if it's within St Andrews area (simplified check)
  const stAndrewsPostcodes = ['KY16', 'KY15', 'DD6', 'DD5'];
  const postcodePrefix = postcode.toUpperCase().substring(0, 4);
  
  return stAndrewsPostcodes.some(prefix => postcodePrefix.startsWith(prefix));
}

export function getDealCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    restaurant: 'bg-red-100 text-red-800',
    bar: 'bg-purple-100 text-purple-800',
    cafe: 'bg-yellow-100 text-yellow-800',
    pub: 'bg-green-100 text-green-800',
    takeaway: 'bg-orange-100 text-orange-800',
    'fine-dining': 'bg-indigo-100 text-indigo-800',
  };
  
  return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    paused: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-amber-100 text-amber-800',
    verified: 'bg-green-100 text-green-800',
  };
  
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}
