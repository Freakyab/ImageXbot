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


export type Transaction = {
  date: string; // Date of the particular transaction
  description: string; // Description of the particular transaction
  ref_No: string; // Ref No./ChequeNo. of the particular transaction
  amount: number; // Amount of the particular transaction
  ai: string; // AI-generated category like petrol, food, etc.
  category: string; // Category of the transaction (credit/debit)
  balance_after_Transaction: number; // Balance after the transaction
};

export type ExpenseAnalysisResponse = {
  summary: string; // Summary of the expense analysis
  account_Name: string; // Name of the account holder
  starting_date: string; // Starting date of the expense period
  ending_date: string; // Ending date of the expense period
  beginning_balance: number; // Beginning balance of the account
  ending_balance: number; // Ending balance of the account
  transactions: Transaction[]; // List of transactions
};

export type Message = {
  role: "user" | "model";
  content: string;
};