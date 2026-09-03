import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CitizenChrome } from "@/components/nav/CitizenChrome";

export default async function CitizenLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "CITIZEN") redirect("/");
  return <CitizenChrome user={user}>{children}</CitizenChrome>;
}
