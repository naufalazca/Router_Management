import { z } from 'zod';

// Create Board
export const createBoardSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Board name is required').max(100),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
    icon: z.string().max(50).optional(),
  }),
});

// Update Board
export const updateBoardSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid board ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
    icon: z.string().max(50).optional(),
    position: z.number().int().min(0).optional(),
    isArchived: z.boolean().optional(),
  }),
});

// Get Board by ID
export const getBoardByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid board ID'),
  }),
});

// Delete Board
export const deleteBoardSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid board ID'),
  }),
});

// Reorder Boards
export const reorderBoardsSchema = z.object({
  body: z.object({
    boardIds: z.array(z.string().uuid()).min(1, 'At least one board ID is required'),
  }),
});

// Types
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type GetBoardByIdInput = z.infer<typeof getBoardByIdSchema>;
export type DeleteBoardInput = z.infer<typeof deleteBoardSchema>;
export type ReorderBoardsInput = z.infer<typeof reorderBoardsSchema>;
