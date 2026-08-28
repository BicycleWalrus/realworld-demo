import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import ContainerRow from "../components/ContainerRow";
import UsersPagination from "../components/UsersPagination";
import getUsers from "../services/getUsers";

const BIO_SNIPPET_LENGTH = 100;

function bioSnippet(bio) {
  if (!bio) return "";
  return bio.length > BIO_SNIPPET_LENGTH
    ? `${bio.slice(0, BIO_SNIPPET_LENGTH)}...`
    : bio;
}

function UserDirectory() {
  const [{ users, usersCount }, setUsersData] = useState({
    users: [],
    usersCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers({})
      .then(setUsersData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ContainerRow>
      <div className="col-xs-12 col-md-10 offset-md-1">
        <h1>Author Directory</h1>

        {users?.length > 0
          ? users.map((user) => (
              <Link
                className="user-directory-entry"
                key={user.username}
                to={`/profile/${user.username}`}
                state={user}
              >
                <Avatar alt={user.username} className="user-pic" src={user.image} />
                <h4>{user.username}</h4>
                <p>{bioSnippet(user.bio)}</p>
              </Link>
            ))
          : !loading && <p>No authors found.</p>}

        <UsersPagination updateUsers={setUsersData} usersCount={usersCount} />
      </div>
    </ContainerRow>
  );
}

export default UserDirectory;
