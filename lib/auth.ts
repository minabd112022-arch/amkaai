import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user) return null;

  return session.user;
}