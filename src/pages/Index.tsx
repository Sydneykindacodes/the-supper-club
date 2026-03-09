import SupperClub from "@/components/supper-club/SupperClub";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  signOut: () => Promise<void>;
}

const Index = ({ user, signOut }: Props) => <SupperClub user={user} signOut={signOut} />;

export default Index;
