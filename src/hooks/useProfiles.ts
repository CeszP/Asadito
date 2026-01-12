import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export type ProfileRow = { id: string; display_name: string | null };

export function useProfiles(userIds: string[]) {
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  const key = useMemo(
    () => Array.from(new Set(userIds)).sort().join(","),
    [userIds]
  );

  useEffect(() => {
    const ids = key ? key.split(",").filter(Boolean) : [];
    if (ids.length === 0) return;

    supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", ids)
      .then(({ data, error }) => {
        if (error) return;
        const map: Record<string, ProfileRow> = {};
        for (const p of data ?? []) map[p.id] = p as ProfileRow;
        setProfiles(map);
      });
  }, [key]);

  return profiles;
}
