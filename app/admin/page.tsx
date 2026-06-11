import AdminClient from "@/components/AdminClient";
import { isAdmin } from "@/lib/admin";

export default async function AdminPage() {
  return <AdminClient authenticated={await isAdmin()} />;
}
