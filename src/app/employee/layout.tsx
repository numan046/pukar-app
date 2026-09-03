import { GovChrome } from "@/components/nav/GovChrome";
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <GovChrome>{children}</GovChrome>;
}
