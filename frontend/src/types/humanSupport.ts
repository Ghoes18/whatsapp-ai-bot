export interface HumanSupportRequest {
  id: string;
  client_id: string;
  status: 'pending' | 'in_progress' | 'resolved';
  original_message: string;
  created_at: string;
  resolved_at?: string;
  handled_by?: string;
  notes?: string;
  clients: {
    id: string;
    name?: string;
    phone: string;
  };
} 