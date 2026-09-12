import { redirect } from 'next/navigation';

/** /supplies merged into the Pantry hub (§5.5 nav spec). */
export default function SuppliesRedirect() {
  redirect('/pantry');
}
