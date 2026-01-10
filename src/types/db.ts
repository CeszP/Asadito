// src/types/db.ts

export type EventRow = {
  id: string;
  title: string;
  event_datetime: string | null;
  location_text: string | null;
  created_by: string;
  created_at: string;
};

export type EventMemberRow = {
  id: string;
  event_id: string;
  user_id: string;
  role: "owner" | "member";
  status: "going" | "not_going" | "invited";
  created_at: string;
};

export type ItemStatus = "pending" | "bought" | "delivered";

export type ItemRow = {
  id: string;
  event_id: string;
  name: string;
  category: string;
  qty: number | null;
  unit: string | null;
  assigned_to: string | null;
  status: ItemStatus;
  created_by: string;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  event_id: string;
  paid_by: string;
  amount: number;
  note: string | null;
  created_at: string;
};
