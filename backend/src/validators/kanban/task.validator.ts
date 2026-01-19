import { z } from 'zod';
import { TaskPriority } from '@prisma/client';

// Create Task
export const createTaskSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    listId: z.string().uuid('Invalid list ID'),
  }),
  body: z.object({
    title: z.string().min(1, 'Task title is required').max(200),
    description: z.string().optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    dueDate: z.string().datetime().optional(),
    startDate: z.string().datetime().optional(),
    estimatedHours: z.number().positive().optional(),
    routerId: z.string().uuid('Invalid router ID').optional(),
  }),
});

// Update Task
export const updateTaskSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    listId: z.string().uuid('Invalid list ID'),
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    completedAt: z.string().datetime().optional().nullable(),
    estimatedHours: z.number().positive().optional().nullable(),
    routerId: z.string().uuid('Invalid router ID').optional().nullable(),
    position: z.number().int().min(0).optional(),
    isArchived: z.boolean().optional(),
  }),
});

// Move Task to another list
export const moveTaskSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    listId: z.string().uuid('Invalid list ID'),
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    targetListId: z.string().uuid('Invalid target list ID'),
    position: z.number().int().min(0),
  }),
});

// Get Task by ID
export const getTaskByIdSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    listId: z.string().uuid('Invalid list ID'),
    id: z.string().uuid('Invalid task ID'),
  }),
});

// Delete Task
export const deleteTaskSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    listId: z.string().uuid('Invalid list ID'),
    id: z.string().uuid('Invalid task ID'),
  }),
});

// Query filters for listing tasks
export const getTasksSchema = z.object({
  params: z.object({
    boardId: z.string().uuid('Invalid board ID'),
    listId: z.string().uuid('Invalid list ID'),
  }),
  query: z.object({
    priority: z.nativeEnum(TaskPriority).optional(),
    routerId: z.string().uuid().optional(),
    isArchived: z.string().transform(val => val === 'true').optional(),
  }).optional(),
});

// Types
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type GetTaskByIdInput = z.infer<typeof getTaskByIdSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
export type GetTasksInput = z.infer<typeof getTasksSchema>;
