import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GovChrome } from "@/components/nav/GovChrome";

export default async function CmoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "CMO") redirect("/");
  return <GovChrome>{children}</GovChrome>;
}
