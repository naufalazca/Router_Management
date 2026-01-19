import { z } from 'zod';

// Create Comment
export const createCommentSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    content: z.string().min(1, 'Comment content is required').max(5000),
  }),
});

// Update Comment
export const updateCommentSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    id: z.string().uuid('Invalid comment ID'),
  }),
  body: z.object({
    content: z.string().min(1, 'Comment content is required').max(5000),
  }),
});

// Delete Comment
export const deleteCommentSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    id: z.string().uuid('Invalid comment ID'),
  }),
});

// Get Comments
export const getCommentsSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
});

// Types
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
