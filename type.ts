export type User = {
  email: string;
  name: string;
  picture: string;
  _id: string;
  token: string;
};

export type Chat = {
  _id: string;
  userId: string;
  content: string;
  imageUrl?: string;
  isImage: boolean;
  type: string;
  tokenUsed: number;
  createdAt: string;
}