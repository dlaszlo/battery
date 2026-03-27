import { useState } from "react";
import { validateToken } from "@/lib/github";
import type { GitHubConfig } from "@/lib/types";

export function useGitHubValidation() {
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = async (config: GitHubConfig): Promise<boolean> => {
    setValidating(true);
    setError(null);

    try {
      const valid = await validateToken(config);
      if (!valid) {
        setError("Érvénytelen token vagy nem létező repó. Ellenőrizd a beállításokat.");
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hálózati hiba");
      return false;
    } finally {
      setValidating(false);
    }
  };

  return { validate, validating, error };
}
