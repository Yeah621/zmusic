import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { confirmDestination } from '@/lib/auth/confirm';
import { createClient } from '@/lib/supabase/server';

/**
 * Tautan konfirmasi email (alur token_hash, berfungsi lintas perangkat). Ubah template email di dashboard Supabase menjadi
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }} (lihat docs/supabase.md).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const path = await confirmDestination(
    { tokenHash: searchParams.get('token_hash'), type: searchParams.get('type'), next: searchParams.get('next'), origin },
    async ({ type, tokenHash }) => {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
      return !error;
    },
  );
  return NextResponse.redirect(new URL(path, origin));
}
