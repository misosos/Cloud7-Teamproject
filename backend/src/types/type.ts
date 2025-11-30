export interface Guild {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  emblemUrl?: string | null;
  ownerId: number;
  createdAt: string; 
}


export interface CreateGuildPayload {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  emblemUrl?: string;
}