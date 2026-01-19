import { z } from 'zod';
import { TimeEntryType } from '@prisma/client';

// Create Time Entry (Manual)
export const createTimeEntrySchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    entryType: z.nativeEnum(TimeEntryType),
    duration: z.number().int().positive('Duration must be positive'),
    description: z.string().max(500).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
  }),
});

// Start Timer
export const startTimerSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    description: z.string().max(500).optional(),
  }),
});

// Stop Timer
export const stopTimerSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    id: z.string().uuid('Invalid time entry ID'),
  }),
});

// Update Time Entry
export const updateTimeEntrySchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    id: z.string().uuid('Invalid time entry ID'),
  }),
  body: z.object({
    duration: z.number().int().positive().optional(),
    description: z.string().max(500).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
  }),
});

// Delete Time Entry
export const deleteTimeEntrySchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    id: z.string().uuid('Invalid time entry ID'),
  }),
});

// Get Time Entries
export const getTimeEntriesSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
});

// Get Active Timer
export const getActiveTimerSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
});

// Types
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type StartTimerInput = z.infer<typeof startTimerSchema>;
export type StopTimerInput = z.infer<typeof stopTimerSchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type DeleteTimeEntryInput = z.infer<typeof deleteTimeEntrySchema>;
export type GetTimeEntriesInput = z.infer<typeof getTimeEntriesSchema>;
export type GetActiveTimerInput = z.infer<typeof getActiveTimerSchema>;
