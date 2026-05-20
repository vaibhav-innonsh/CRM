'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SettingsRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/profile');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <p className="text-xs text-slate-400 font-bold">Redirecting to CRM preferences...</p>
    </div>
  );
}
