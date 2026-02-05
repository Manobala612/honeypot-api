const sessions = new Map();

export function createSession(id) {
  sessions.set(id, {
    logs: []
  });
}

export function getSession(id) {
  return sessions.get(id);
}

export function saveSession(id, data) {
  sessions.set(id, data);
}

export function deleteSession(id) {
  sessions.delete(id);
}
