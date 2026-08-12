import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey);

  const email = `browser-e2e-test-${Date.now()}@example.com`;
  const { data, error } = await client.auth.signUp({
    email,
    password: "TestPass123",
    options: {
      data: { name: "브라우저테스트", phone: undefined, marketing_consent: false, privacy_consent_at: new Date().toISOString() },
      emailRedirectTo: "http://localhost:3000/auth/confirm?next=%2Fsupport",
    },
  });

  console.log("email:", email);
  console.log("error:", error ? { message: error.message, status: error.status, name: error.name, code: (error as unknown as { code?: string }).code } : null);
  console.log("user:", data.user ? { id: data.user.id, email: data.user.email } : null);
  console.log("session:", Boolean(data.session));
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
