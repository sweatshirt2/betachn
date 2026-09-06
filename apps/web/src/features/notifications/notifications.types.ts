export type NotificationPayload = {
  id: string;
  category: string;
  type: string;
  paramsJson: Record<string, unknown>;
  linkPath: string | null;
  readAt: string | null;
};
