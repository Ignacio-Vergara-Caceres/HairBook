import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("hairbook_session");
  return Response.json({ ok: true });
}
