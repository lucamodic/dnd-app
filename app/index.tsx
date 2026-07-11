import { Redirect } from "expo-router";
import { useAuth } from "@/store/auth";

/** Punto de entrada: manda al login o a la app según haya sesión. */
export default function Index() {
  const token = useAuth((s) => s.token);
  return <Redirect href={token ? "/(tabs)" : "/login"} />;
}
