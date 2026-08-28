import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactPaginate from "react-paginate";
import ContainerRow from "../components/ContainerRow";
import Avatar from "../components/Avatar";
import getProfiles from "../services/getProfiles";

const PAGE_SIZE = 10;
const BIO_SNIPPET_LENGTH = 100;

function bioSnippet(bio) {
  if (!bio) return "";
  if (bio.length <= BIO_SNIPPET_LENGTH) return bio;
  return `${bio.slice(0, BIO_SNIPPET_LENGTH)}...`;
}

// REQ-074/REQ-075/REQ-076: a paginated, unauthenticated directory of user
// profiles (username, avatar, bio snippet), each entry linking to that
// user's full profile page.
function Directory() {
  const [profiles, setProfiles] = useState(null);
  const [profilesCount, setProfilesCount] = useState(0);

  useEffect(() => {
    getProfiles({ limit: PAGE_SIZE, page: 0 })
      .then(({ profiles, profilesCount }) => {
        setProfiles(profiles);
        setProfilesCount(profilesCount);
      })
      .catch(console.error);
  }, []);

  const handlePageChange = ({ selected: page }) => {
    getProfiles({ limit: PAGE_SIZE, page })
      .then(({ profiles, profilesCount }) => {
        setProfiles(profiles);
        setProfilesCount(profilesCount);
      })
      .catch(console.error);
  };

  const totalPages = Math.ceil(profilesCount / PAGE_SIZE);

  return (
    <div className="directory-page">
      <ContainerRow type="page">
        <div className="col-md-10 offset-md-1">
          <h1>User Directory</h1>

          {profiles === null && <p>Loading...</p>}

          {profiles !== null && profiles.length === 0 && <p>No users yet.</p>}

          {profiles !== null && profiles.length > 0 && (
            <ul className="user-directory-list">
              {profiles.map(({ username, image, bio }) => (
                <li className="user-directory-item" key={username}>
                  <Link to={`/profile/${username}`}>
                    <Avatar alt={username} className="user-directory-avatar" src={image} />
                    <span className="user-directory-username">{username}</span>
                    {bio && <p className="user-directory-bio">{bioSnippet(bio)}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <ReactPaginate
              activeClassName="active"
              breakClassName="page-item"
              breakLabel="..."
              breakLinkClassName="page-link"
              containerClassName="pagination pagination-sm"
              nextClassName="page-item"
              nextLabel={<i className="ion-arrow-right-b"></i>}
              nextLinkClassName="page-link"
              onPageChange={handlePageChange}
              pageClassName="page-item"
              pageCount={totalPages}
              pageLinkClassName="page-link"
              previousClassName="page-item"
              previousLabel={<i className="ion-arrow-left-b"></i>}
              previousLinkClassName="page-link"
              renderOnZeroPageCount={null}
            />
          )}
        </div>
      </ContainerRow>
    </div>
  );
}

export default Directory;
