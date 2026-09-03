import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GovChrome } from "@/components/nav/GovChrome";

export default async function CmLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "CM") redirect("/");
  return <GovChrome>{children}</GovChrome>;
}
