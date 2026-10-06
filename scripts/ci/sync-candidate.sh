#!/usr/bin/env bash
# Only advance the exact certified candidate after verified production deployment.
# The server-side explicit lease is the authority; the pre-read is only a fast path.
set -euo pipefail
: "${CERTIFIED_SHA:?Missing certified source SHA}"
: "${MAIN_HEAD:?Missing verified deployed main SHA}"
[[ "$CERTIFIED_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid certified SHA' >&2; exit 1; }
[[ "$MAIN_HEAD" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid deployed main SHA' >&2; exit 1; }

read_candidate() {
  local line
  line="$(git ls-remote --exit-code origin refs/heads/candidate)" || return 1
  [[ "$line" =~ ^([0-9a-f]{40})[[:space:]]refs/heads/candidate$ ]] || return 1
  printf '%s\n' "${BASH_REMATCH[1]}"
}

git cat-file -e "${CERTIFIED_SHA}^{commit}"
git cat-file -e "${MAIN_HEAD}^{commit}"
git merge-base --is-ancestor "$CERTIFIED_SHA" "$MAIN_HEAD" || {
  echo 'Refusing synchronization: deployed main does not contain the certified source.' >&2
  exit 1
}
current_candidate="$(read_candidate)"
if [ "$current_candidate" = "$MAIN_HEAD" ]; then
  echo 'ALREADY_SYNCHRONIZED: candidate already points to the verified deployed main.'
  exit 0
fi
if [ "$current_candidate" != "$CERTIFIED_SHA" ]; then
  echo 'SUPERSEDED: candidate changed; no update was attempted.'
  exit 0
fi

# Disable implicit follow-tags; update one ref, with an explicit expected old value.
if git -c push.followTags=false push --porcelain \
    --force-with-lease="refs/heads/candidate:$CERTIFIED_SHA" \
    origin "$MAIN_HEAD:refs/heads/candidate"; then
  current_candidate="$(read_candidate)"
  if [ "$current_candidate" = "$MAIN_HEAD" ]; then
    echo 'SYNCHRONIZED: exact certified candidate advanced to verified deployed main.'
  else
    echo 'ADVANCED_AFTER_SYNC: lease update succeeded; later candidate work was left untouched.'
  fi
else
  # A lost lease is a superseded no-op, not a reason to retry with force.
  current_candidate="$(read_candidate)"
  if [ "$current_candidate" != "$CERTIFIED_SHA" ]; then
    echo 'SUPERSEDED_DURING_SYNC: remote candidate changed; no forced retry.'
    exit 0
  fi
  echo 'Synchronization failed without a candidate change; refusing to hide a transport/policy error.' >&2
  exit 1
fi
