export type ActivityEventPayload = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};
