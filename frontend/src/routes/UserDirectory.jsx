import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactPaginate from "react-paginate";
import Avatar from "../components/Avatar";
import ContainerRow from "../components/ContainerRow";
import getUserDirectory from "../services/getUserDirectory";

const BIO_SNIPPET_LENGTH = 100;

function bioSnippet(bio) {
  if (!bio) return "";
  return bio.length > BIO_SNIPPET_LENGTH
    ? `${bio.slice(0, BIO_SNIPPET_LENGTH)}...`
    : bio;
}

function UserDirectory() {
  const [{ users, usersCount }, setDirectory] = useState({
    users: [],
    usersCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserDirectory()
      .then(setDirectory)
      .finally(() => setLoading(false));
  }, []);

  const handlePageChange = ({ selected: page }) => {
    setLoading(true);
    getUserDirectory({ page })
      .then(setDirectory)
      .finally(() => setLoading(false));
  };

  return (
    <ContainerRow type="page">
      <div className="col-md-12">
        <h1>Author Directory</h1>

        {loading ? (
          <p>Loading authors...</p>
        ) : users.length > 0 ? (
          <ul className="user-directory-list">
            {users.map(({ username, image, bio }) => (
              <li key={username}>
                <Link to={`/profile/${username}`}>
                  <Avatar alt={username} className="user-pic" src={image} />
                  <span>{username}</span>
                </Link>
                {bio && <p>{bioSnippet(bio)}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p>No authors found.</p>
        )}

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
          pageCount={Math.ceil(usersCount / 20)}
          pageLinkClassName="page-link"
          previousClassName="page-item"
          previousLabel={<i className="ion-arrow-left-b"></i>}
          previousLinkClassName="page-link"
          renderOnZeroPageCount={null}
        />
      </div>
    </ContainerRow>
  );
}

export default UserDirectory;
