import ProfilesPagination from "../components/ProfilesPagination";
import UserCard from "../components/UserCard";
import useProfiles from "../hooks/useProfiles";

function Directory() {
  const { profiles, profilesCount, loading, setProfilesData } = useProfiles();

  const updateProfile = (updated) => {
    setProfilesData((prev) => ({
      ...prev,
      profiles: prev.profiles.map((profile) =>
        profile.username === updated.username ? updated : profile
      ),
    }));
  };

  return (
    <div className="profile-page">
      <div className="container page">
        <h1>User Directory</h1>

        {loading ? (
          <div className="article-preview">
            <em>Loading users...</em>
          </div>
        ) : profiles.length > 0 ? (
          <>
            <div className="row">
              {profiles.map((profile) => (
                <UserCard key={profile.username} {...profile} updateProfile={updateProfile} />
              ))}
            </div>

            <ProfilesPagination profilesCount={profilesCount} updateProfiles={setProfilesData} />
          </>
        ) : (
          <div className="article-preview">No users to display.</div>
        )}
      </div>
    </div>
  );
}

export default Directory;
