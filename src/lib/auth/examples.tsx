/**
 * Example: How to use permissions in a component
 */

import { useCanCreateEvent, useIsOrganizer, PermissionGuard, RequireOrganizer } from '@/lib/auth/guards';
import { useAuthStore } from '@/lib/auth/store';

export function EventActionsExample() {
  // Method 1: Using hooks
  const canCreate = useCanCreateEvent();
  const isOrganizer = useIsOrganizer();
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      {/* Show button only if user can create events */}
      {canCreate && (
        <button className="btn btn-primary">
          Dodaj wydarzenie
        </button>
      )}

      {/* Method 2: Using permission guard component */}
      <PermissionGuard
        permission="canCreateEvent"
        fallback={<p>Musisz być organizatorem aby dodać wydarzenie</p>}
      >
        <button className="btn btn-primary">
          Dodaj wydarzenie
        </button>
      </PermissionGuard>

      {/* Method 3: Using require organizer component */}
      <RequireOrganizer
        fallback={
          <div className="alert alert-warning">
            Aby móc organizować wydarzenia, musisz być organizatorem
          </div>
        }
      >
        <div className="organizer-dashboard">
          <h2>Panel Organizatora</h2>
          <p>Witaj {user?.username}!</p>
        </div>
      </RequireOrganizer>
    </div>
  );
}

/**
 * Example: Checking permissions in event edit page
 */
export function EventEditExample({ eventOwnerId }: { eventOwnerId: number }) {
  const permissions = useAuthStore((state) => state.permissions);
  
  // Check if current user can edit this event
  if (!permissions?.canEditEvent(eventOwnerId)) {
    return <div className="alert alert-danger">Nie masz uprawnień do edycji tego wydarzenia</div>;
  }

  return (
    <div>
      <h1>Edytuj wydarzenie</h1>
      {/* Edit form */}
    </div>
  );
}

/**
 * Example: Checking multiple permissions
 */
export function AdminPanelExample() {
  const isSuperuser = useAuthStore((state) => state.can('isSuperuser'));
  const canManage = useAuthStore((state) => state.can('canManageOrganizerRequests'));

  if (!isSuperuser && !canManage) {
    return <div>Brak dostępu</div>;
  }

  return (
    <div>
      <h1>Panel Administracyjny</h1>
      {/* Admin content */}
    </div>
  );
}

/**
 * Example: Getting all permissions for display
 */
export function PermissionsDebugExample() {
  const permissions = useAuthStore((state) => state.permissions);
  
  if (!permissions) {
    return <p>Brak danych uprawnień</p>;
  }

  const perms = permissions.getPermissions();

  return (
    <div className="debug-panel">
      <h3>Debug: Twoje uprawnienia</h3>
      <ul>
        {Object.entries(perms).map(([key, value]) => (
          <li key={key}>
            <code>{key}</code>: {value ? '✓' : '✗'}
          </li>
        ))}
      </ul>
    </div>
  );
}
