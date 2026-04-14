import { useCallback, useEffect, useState } from "react";
import {
  getEventRecommendationsDB,
  type RecommendationRowDB,
} from "../lib/recommendations";

export function useEventRecommendations(eventId?: string) {
  const [data, setData] = useState<RecommendationRowDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getEventRecommendationsDB(eventId);
      setData(rows);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
