import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/store/auth";
import { hasSeenIntro } from "@/lib/onboarding";

/** Punto de entrada: manda al login, al onboarding (primera vez) o a la app según la sesión. */
export default function Index() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const [checked, setChecked] = useState(false);
  const [needIntro, setNeedIntro] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token || !user) {
      setChecked(true);
      return;
    }
    hasSeenIntro(user.username).then((seen) => {
      if (alive) {
        setNeedIntro(!seen);
        setChecked(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [token, user]);

  if (!token) return <Redirect href="/login" />;
  if (!checked) return null;
  return <Redirect href={needIntro ? "/onboarding" : "/(tabs)"} />;
}
