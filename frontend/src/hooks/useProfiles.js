import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import getProfiles from "../services/getProfiles";

function useProfiles() {
  const [{ profiles, profilesCount }, setProfilesData] = useState({
    profiles: [],
    profilesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { headers } = useAuth();

  useEffect(() => {
    setLoading(true);

    getProfiles({ headers })
      .then(setProfilesData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [headers]);

  return { profiles, profilesCount, loading, setProfilesData };
}

export default useProfiles;
