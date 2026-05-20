import { redirect } from 'next/navigation';

export default function Home() {
  // Server-side redirect to the secure executive dashboard home
  redirect('/dashboard');
}
