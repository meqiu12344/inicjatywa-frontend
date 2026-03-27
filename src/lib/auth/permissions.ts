/**
 * Permission system for Next.js frontend
 * Mirrors Django permissions: roles, checks, guards
 */

export type UserRole = 'user' | 'organizer';
export type OrganizerRequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
}

export interface Profile {
  id: number;
  user_id: number;
  role: UserRole;
  account_locked: boolean;
  organizer_request_pending: boolean;
  email_verified: boolean;
  phone_number: string | null;
}

export interface OrganizerRequest {
  id: number;
  user_id: number;
  status: OrganizerRequestStatus;
  reviewed_by_id: number | null;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
}

/**
 * Permission checker class
 */
export class PermissionChecker {
  constructor(private user: User | null, private profile: Profile | null) {}

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user !== null && this.user.is_active;
  }

  /**
   * Check if user is superuser/admin
   */
  isSuperuser(): boolean {
    return this.user?.is_superuser ?? false;
  }

  /**
   * Check if user is staff
   */
  isStaff(): boolean {
    return this.user?.is_staff ?? false;
  }

  /**
   * Check if user has organizer role
   */
  isOrganizer(): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isSuperuser()) return true; // Superusers are organizers by default
    return this.profile?.role === 'organizer';
  }

  /**
   * Check if user is regular user
   */
  isRegularUser(): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isSuperuser()) return true;
    return this.profile?.role === 'user';
  }

  /**
   * Check if user account is locked
   */
  isAccountLocked(): boolean {
    return this.profile?.account_locked ?? false;
  }

  /**
   * Check if organizer request is pending
   */
  hasOrganizerRequestPending(): boolean {
    return this.profile?.organizer_request_pending ?? false;
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(): boolean {
    return this.profile?.email_verified ?? false;
  }

  /**
   * Check if user can create events
   */
  canCreateEvent(): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isAccountLocked()) return false;
    return this.isOrganizer();
  }

  /**
   * Check if user can edit an event (by user_id)
   */
  canEditEvent(eventOwnerId: number): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isAccountLocked()) return false;
    // Superuser can edit any event
    if (this.isSuperuser()) return true;
    // Organizer can only edit their own
    if (this.isOrganizer()) return this.user?.id === eventOwnerId;
    return false;
  }

  /**
   * Check if user can delete an event
   */
  canDeleteEvent(eventOwnerId: number): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isAccountLocked()) return false;
    // Superuser can delete any event
    if (this.isSuperuser()) return true;
    // Organizer can only delete their own
    if (this.isOrganizer()) return this.user?.id === eventOwnerId;
    return false;
  }

  /**
   * Check if user can view admin panel
   */
  canAccessAdminPanel(): boolean {
    return this.isSuperuser() || this.isStaff();
  }

  /**
   * Check if user can manage organizer requests
   */
  canManageOrganizerRequests(): boolean {
    return this.isSuperuser() || this.isStaff();
  }

  /**
   * Check if user can register for events
   */
  canRegisterForEvent(): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isAccountLocked()) return false;
    return true; // All authenticated users can register
  }

  /**
   * Check if user can request organizer role
   */
  canRequestOrganizerRole(): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.profile?.role === 'organizer') return false; // Already organizer
    if (this.hasOrganizerRequestPending()) return false; // Already has pending request
    return true;
  }

  /**
   * Get permission object for template/component use
   */
  getPermissions() {
    return {
      isAuthenticated: this.isAuthenticated(),
      isSuperuser: this.isSuperuser(),
      isStaff: this.isStaff(),
      isOrganizer: this.isOrganizer(),
      isRegularUser: this.isRegularUser(),
      isAccountLocked: this.isAccountLocked(),
      hasOrganizerRequestPending: this.hasOrganizerRequestPending(),
      isEmailVerified: this.isEmailVerified(),
      canCreateEvent: this.canCreateEvent(),
      canAccessAdminPanel: this.canAccessAdminPanel(),
      canManageOrganizerRequests: this.canManageOrganizerRequests(),
      canRegisterForEvent: this.canRegisterForEvent(),
      canRequestOrganizerRole: this.canRequestOrganizerRole(),
    };
  }
}

/**
 * Factory function to create permission checker
 */
export function createPermissionChecker(user: User | null, profile: Profile | null) {
  return new PermissionChecker(user, profile);
}
