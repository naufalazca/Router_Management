import { z } from 'zod';

// Create Label
export const createLabelSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Label name is required').max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  }),
});

// Update Label
export const updateLabelSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    id: z.string().uuid('Invalid label ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  }),
});

// Delete Label
export const deleteLabelSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    id: z.string().uuid('Invalid label ID'),
  }),
});

// Add Label to Task
export const addLabelToTaskSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    taskId: z.string().uuid('Invalid task ID'),
    labelId: z.string().uuid('Invalid label ID'),
  }),
});

// Remove Label from Task
export const removeLabelFromTaskSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    taskId: z.string().uuid('Invalid task ID'),
    labelId: z.string().uuid('Invalid label ID'),
  }),
});

// Types
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type DeleteLabelInput = z.infer<typeof deleteLabelSchema>;
export type AddLabelToTaskInput = z.infer<typeof addLabelToTaskSchema>;
export type RemoveLabelFromTaskInput = z.infer<typeof removeLabelFromTaskSchema>;
