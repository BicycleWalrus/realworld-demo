import { useEffect, useRef, useState } from "react";
import { extractMentionCandidates } from "../helpers/linkifyMentions";
import verifyUsernames from "../services/verifyUsernames";

// Resolves which @word candidates across a set of comments correspond to
// real users, returning their canonically-cased usernames (not necessarily
// the casing typed in the comment) for use with linkifyMentions. Runs at
// render time against whatever comments are currently loaded, so it applies
// retroactively to old comments too - mentions aren't stored/resolved at
// comment-creation time.
//
// Uses a single exact-match batch lookup (verifyUsernames), not the
// prefix-search endpoint: a candidate's own username can be starved out of
// an unordered, capped prefix result set by other usernames sharing the
// same prefix, which would silently fail to linkify a real user.
function useMentionUsers(comments) {
  const [knownUsernames, setKnownUsernames] = useState([]);
  const latestRequest = useRef(0);

  useEffect(() => {
    const candidates = [
      ...new Set(comments.flatMap(({ body }) => extractMentionCandidates(body))),
    ];

    if (candidates.length === 0) {
      setKnownUsernames([]);
      return;
    }

    const requestId = ++latestRequest.current;

    verifyUsernames(candidates)
      .then((confirmed) => {
        if (requestId === latestRequest.current) setKnownUsernames(confirmed || []);
      })
      .catch(console.error);
  }, [comments]);

  return knownUsernames;
}

export default useMentionUsers;
