import prisma from './prisma';

export const sendNotificationToAllUsers = async (title: string, body: string, data?: any) => {
  const { Expo } = await import('expo-server-sdk');
  const expo = new Expo();

  // Fetch all users with a push token
  const users: any[] = await (prisma.user as any).findMany({
    where: {
      pushToken: {
        not: null,
      },
    },
    select: {
      pushToken: true,
    },
  });

  const messages: Array<{
    to: string;
    sound: 'default';
    title: string;
    body: string;
    data?: any;
  }> = [];
  for (const user of users) {
    if (!user.pushToken) continue;

    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.error(`Push token ${user.pushToken} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  const chunks = (expo as any).chunkPushMessages(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending notification chunk:', error);
    }
  }

  return tickets;
};
