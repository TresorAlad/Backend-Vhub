import prisma from './prisma';
import admin, { isFirebaseAdminReady } from './firebase';

const CHUNK_SIZE = 500; // FCM multicast limit

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const sendNotificationToAllUsers = async (
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  if (!isFirebaseAdminReady) {
    console.warn('[notifications] Firebase Admin not ready; skipping push send.');
    return { successCount: 0, failureCount: 0 };
  }

  // Fetch all users with an FCM token (stored in user.pushToken)
  const users: Array<{ pushToken: string | null }> = await prisma.user.findMany({
    where: { pushToken: { not: null } },
    select: { pushToken: true },
  });

  const tokens = users.map((u) => u.pushToken).filter((t): t is string => typeof t === 'string' && t.length > 0);
  if (tokens.length === 0) return { successCount: 0, failureCount: 0 };

  const messageData: Record<string, string> | undefined = data ? data : undefined;

  let successCount = 0;
  let failureCount = 0;

  for (const tokenChunk of chunk(tokens, CHUNK_SIZE)) {
    const resp = await admin
      .messaging()
      .sendEachForMulticast({
        tokens: tokenChunk,
        notification: { title, body },
        data: messageData,
      })
      .catch((err) => {
        console.error('[notifications] FCM send failed:', err);
        return null;
      });

    if (!resp) {
      failureCount += tokenChunk.length;
      continue;
    }

    successCount += resp.successCount;
    failureCount += resp.failureCount;
  }

  return { successCount, failureCount };
};
