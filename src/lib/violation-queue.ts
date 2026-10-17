const FLUSH_MS = 3000;
const DEDUPE_MS = 1000;
const MAX_BATCH = 10;

// Leading + trailing batching: the first violation is sent immediately so the teacher
// sees it live, anything that follows within FLUSH_MS is merged into a single request.
export function createViolationQueue(send: (types: string[]) => void) {
  let queue: string[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSentAt = 0;
  const lastSeen = new Map<string, number>();

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];
    lastSentAt = Date.now();
    send(batch);
  }

  function push(type: string) {
    const now = Date.now();
    // blur + visibilitychange fire together for one tab switch — count it once
    if (now - (lastSeen.get(type) ?? 0) < DEDUPE_MS) return;
    lastSeen.set(type, now);

    if (queue.length < MAX_BATCH) queue.push(type);

    const sinceLastSend = now - lastSentAt;
    if (sinceLastSend >= FLUSH_MS) {
      flush();
    } else if (!timer) {
      timer = setTimeout(flush, FLUSH_MS - sinceLastSend);
    }
  }

  return { push, flush };
}
