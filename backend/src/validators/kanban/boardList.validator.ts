import { z } from 'zod';

// Create Board List
export const createBoardListSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'List name is required').max(100),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  }),
});

// Update Board List
export const updateBoardListSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    id: z.string().uuid('Invalid list ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
    position: z.number().int().min(0).optional(),
    isArchived: z.boolean().optional(),
  }),
});

// Get Board List by ID
export const getBoardListByIdSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    id: z.string().uuid('Invalid list ID'),
  }),
});

// Delete Board List
export const deleteBoardListSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    id: z.string().uuid('Invalid list ID'),
  }),
});

// Reorder Lists
export const reorderListsSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
  }),
  body: z.object({
    listIds: z.array(z.string().uuid()).min(1, 'At least one list ID is required'),
  }),
});

// Types
export type CreateBoardListInput = z.infer<typeof createBoardListSchema>;
export type UpdateBoardListInput = z.infer<typeof updateBoardListSchema>;
export type GetBoardListByIdInput = z.infer<typeof getBoardListByIdSchema>;
export type DeleteBoardListInput = z.infer<typeof deleteBoardListSchema>;
export type ReorderListsInput = z.infer<typeof reorderListsSchema>;
