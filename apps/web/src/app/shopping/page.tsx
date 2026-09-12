import { redirect } from 'next/navigation';

/** /shopping merged into the Pantry hub (§5.5 nav spec). */
export default function ShoppingRedirect() {
  redirect('/pantry');
}
