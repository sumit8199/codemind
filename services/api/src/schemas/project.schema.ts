import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
