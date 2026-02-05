const sessions = new Map();

export function createSession(id) {
  sessions.set(id, {
    logs: [],
    extracted: {
      upi_id: null,
      bank_account: null,
      phone_number: null,
      phishing_url: null
    },
    status: "in_progress"
  });
}

export function getSession(id) {
  return sessions.get(id);
}

export function updateSession(id, data) {
  sessions.set(id, data);
}

export function deleteSession(id) {
  sessions.delete(id);
}
