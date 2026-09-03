import { GovChrome } from "@/components/nav/GovChrome";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <GovChrome>{children}</GovChrome>;
}
