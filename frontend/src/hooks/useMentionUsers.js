import { useEffect, useState } from "react";
import { extractMentionCandidates } from "../helpers/linkifyMentions";
import searchUsers from "../services/searchUsers";

// Resolves which @word candidates across a set of comments correspond to
// real users, returning their canonically-cased usernames (not necessarily
// the casing typed in the comment) for use with linkifyMentions. Runs at
// render time against whatever comments are currently loaded, so it applies
// retroactively to old comments too - mentions aren't stored/resolved at
// comment-creation time.
function useMentionUsers(comments) {
  const [knownUsernames, setKnownUsernames] = useState([]);

  useEffect(() => {
    const candidates = [
      ...new Set(comments.flatMap(({ body }) => extractMentionCandidates(body))),
    ];

    if (candidates.length === 0) {
      setKnownUsernames([]);
      return;
    }

    Promise.all(candidates.map((candidate) => searchUsers({ search: candidate })))
      .then((results) => {
        const confirmed = candidates
          .map((candidate, index) =>
            (results[index] || []).find(
              (username) => username.toLowerCase() === candidate.toLowerCase(),
            ),
          )
          .filter(Boolean);

        setKnownUsernames(confirmed);
      })
      .catch(console.error);
  }, [comments]);

  return knownUsernames;
}

export default useMentionUsers;
