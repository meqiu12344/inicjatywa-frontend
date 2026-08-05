import { redirect } from 'next/navigation';

export default function AdminPendingRequestsRedirectPage() {
  redirect('/admin/wnioski-organizatorow');
}
