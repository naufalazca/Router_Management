/**
 * Kanban Routes
 * Personal task management system with boards, lists, tasks, labels, comments, and time tracking
 * Base path: /api/kanban
 */

import { Router } from 'express';
import multer from 'multer';
import boardController from '../../controllers/kanban/board.controller';
import taskController from '../../controllers/kanban/task.controller';
import labelController from '../../controllers/kanban/label.controller';
import commentController from '../../controllers/kanban/comment.controller';
import timeEntryController from '../../controllers/kanban/timeEntry.controller';
import attachmentController from '../../controllers/kanban/attachment.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();

// Multer configuration for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// Apply authentication and ADMIN authorization to all Kanban routes
// Only users with ADMIN role can access Kanban features
router.use(authenticate);
router.use(requireAdmin);

// ==========================================
// BOARD ROUTES
// ==========================================

/**
 * @route   GET /api/kanban/boards
 * @desc    Get all boards for logged-in user
 * @access  Private
 */
router.get('/boards', boardController.getUserBoards);

/**
 * @route   GET /api/kanban/boards/archived
 * @desc    Get all archived boards
 * @access  Private
 */
router.get('/boards/archived', boardController.getArchivedBoards);

/**
 * @route   POST /api/kanban/boards
 * @desc    Create a new board
 * @access  Private
 */
router.post('/boards', boardController.createBoard);

/**
 * @route   POST /api/kanban/boards/reorder
 * @desc    Reorder boards
 * @access  Private
 */
router.post('/boards/reorder', boardController.reorderBoards);

/**
 * @route   GET /api/kanban/boards/:id
 * @desc    Get board by ID with full details
 * @access  Private
 */
router.get('/boards/:id', boardController.getBoardById);

/**
 * @route   PUT /api/kanban/boards/:id
 * @desc    Update board
 * @access  Private
 */
router.put('/boards/:id', boardController.updateBoard);

/**
 * @route   DELETE /api/kanban/boards/:id
 * @desc    Archive board (soft delete)
 * @access  Private
 */
router.delete('/boards/:id', boardController.deleteBoard);

/**
 * @route   POST /api/kanban/boards/:id/restore
 * @desc    Restore archived board
 * @access  Private
 */
router.post('/boards/:id/restore', boardController.restoreBoard);

// ==========================================
// BOARD LIST (COLUMNS) ROUTES
// ==========================================

/**
 * @route   GET /api/kanban/boards/:boardId/lists
 * @desc    Get all lists for a board
 * @access  Private
 */
router.get('/boards/:boardId/lists', boardController.getBoardLists);

/**
 * @route   POST /api/kanban/boards/:boardId/lists
 * @desc    Create a new list in board
 * @access  Private
 */
router.post('/boards/:boardId/lists', boardController.createBoardList);

/**
 * @route   POST /api/kanban/boards/:boardId/lists/reorder
 * @desc    Reorder lists in board
 * @access  Private
 */
router.post('/boards/:boardId/lists/reorder', boardController.reorderLists);

/**
 * @route   PUT /api/kanban/boards/:boardId/lists/:id
 * @desc    Update list
 * @access  Private
 */
router.put('/boards/:boardId/lists/:id', boardController.updateBoardList);

/**
 * @route   DELETE /api/kanban/boards/:boardId/lists/:id
 * @desc    Archive list (soft delete)
 * @access  Private
 */
router.delete('/boards/:boardId/lists/:id', boardController.deleteBoardList);

// ==========================================
// TASK ROUTES
// ==========================================

/**
 * @route   GET /api/kanban/boards/:boardId/lists/:listId/tasks
 * @desc    Get all tasks in a list
 * @access  Private
 */
router.get('/boards/:boardId/lists/:listId/tasks', taskController.getListTasks);

/**
 * @route   POST /api/kanban/boards/:boardId/lists/:listId/tasks
 * @desc    Create a new task in list
 * @access  Private
 */
router.post('/boards/:boardId/lists/:listId/tasks', taskController.createTask);

/**
 * @route   GET /api/kanban/boards/:boardId/lists/:listId/tasks/:id
 * @desc    Get task by ID with full details
 * @access  Private
 */
router.get('/boards/:boardId/lists/:listId/tasks/:id', taskController.getTaskById);

/**
 * @route   PUT /api/kanban/boards/:boardId/lists/:listId/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/boards/:boardId/lists/:listId/tasks/:id', taskController.updateTask);

/**
 * @route   POST /api/kanban/boards/:boardId/lists/:listId/tasks/:id/move
 * @desc    Move task to another list
 * @access  Private
 */
router.post('/boards/:boardId/lists/:listId/tasks/:id/move', taskController.moveTask);

/**
 * @route   DELETE /api/kanban/boards/:boardId/lists/:listId/tasks/:id
 * @desc    Archive task (soft delete)
 * @access  Private
 */
router.delete('/boards/:boardId/lists/:listId/tasks/:id', taskController.deleteTask);

/**
 * @route   GET /api/kanban/tasks/:id/time-stats
 * @desc    Get time tracking statistics for task
 * @access  Private
 */
router.get('/tasks/:id/time-stats', taskController.getTaskTimeStats);

// ==========================================
// LABEL ROUTES
// ==========================================

/**
 * @route   GET /api/kanban/boards/:boardId/labels
 * @desc    Get all labels for a board
 * @access  Private
 */
router.get('/boards/:boardId/labels', labelController.getBoardLabels);

/**
 * @route   POST /api/kanban/boards/:boardId/labels
 * @desc    Create a new label
 * @access  Private
 */
router.post('/boards/:boardId/labels', labelController.createLabel);

/**
 * @route   PUT /api/kanban/boards/:boardId/labels/:id
 * @desc    Update label
 * @access  Private
 */
router.put('/boards/:boardId/labels/:id', labelController.updateLabel);

/**
 * @route   DELETE /api/kanban/boards/:boardId/labels/:id
 * @desc    Delete label
 * @access  Private
 */
router.delete('/boards/:boardId/labels/:id', labelController.deleteLabel);

/**
 * @route   POST /api/kanban/boards/:boardId/tasks/:taskId/labels/:labelId
 * @desc    Add label to task
 * @access  Private
 */
router.post('/boards/:boardId/tasks/:taskId/labels/:labelId', labelController.addLabelToTask);

/**
 * @route   DELETE /api/kanban/boards/:boardId/tasks/:taskId/labels/:labelId
 * @desc    Remove label from task
 * @access  Private
 */
router.delete('/boards/:boardId/tasks/:taskId/labels/:labelId', labelController.removeLabelFromTask);

/**
 * @route   GET /api/kanban/boards/:boardId/labels/:labelId/tasks
 * @desc    Get all tasks with a specific label
 * @access  Private
 */
router.get('/boards/:boardId/labels/:labelId/tasks', labelController.getTasksByLabel);

// ==========================================
// COMMENT ROUTES
// ==========================================

/**
 * @route   GET /api/kanban/tasks/:taskId/comments
 * @desc    Get all comments for a task
 * @access  Private
 */
router.get('/tasks/:taskId/comments', commentController.getTaskComments);

/**
 * @route   POST /api/kanban/tasks/:taskId/comments
 * @desc    Create a new comment
 * @access  Private
 */
router.post('/tasks/:taskId/comments', commentController.createComment);

/**
 * @route   PUT /api/kanban/tasks/:taskId/comments/:id
 * @desc    Update comment (only owner)
 * @access  Private
 */
router.put('/tasks/:taskId/comments/:id', commentController.updateComment);

/**
 * @route   DELETE /api/kanban/tasks/:taskId/comments/:id
 * @desc    Delete comment (only owner)
 * @access  Private
 */
router.delete('/tasks/:taskId/comments/:id', commentController.deleteComment);

// ==========================================
// TIME ENTRY ROUTES
// ==========================================

/**
 * @route   GET /api/kanban/tasks/:taskId/time-entries
 * @desc    Get all time entries for a task
 * @access  Private
 */
router.get('/tasks/:taskId/time-entries', timeEntryController.getTaskTimeEntries);

/**
 * @route   POST /api/kanban/tasks/:taskId/time-entries
 * @desc    Create manual time entry
 * @access  Private
 */
router.post('/tasks/:taskId/time-entries', timeEntryController.createManualTimeEntry);

/**
 * @route   POST /api/kanban/tasks/:taskId/timer/start
 * @desc    Start timer for task
 * @access  Private
 */
router.post('/tasks/:taskId/timer/start', timeEntryController.startTimer);

/**
 * @route   POST /api/kanban/tasks/:taskId/timer/:id/stop
 * @desc    Stop running timer
 * @access  Private
 */
router.post('/tasks/:taskId/timer/:id/stop', timeEntryController.stopTimer);

/**
 * @route   GET /api/kanban/tasks/:taskId/timer/active
 * @desc    Get active timer for user on task
 * @access  Private
 */
router.get('/tasks/:taskId/timer/active', timeEntryController.getActiveTimer);

/**
 * @route   PUT /api/kanban/tasks/:taskId/time-entries/:id
 * @desc    Update time entry
 * @access  Private
 */
router.put('/tasks/:taskId/time-entries/:id', timeEntryController.updateTimeEntry);

/**
 * @route   DELETE /api/kanban/tasks/:taskId/time-entries/:id
 * @desc    Delete time entry
 * @access  Private
 */
router.delete('/tasks/:taskId/time-entries/:id', timeEntryController.deleteTimeEntry);

/**
 * @route   GET /api/kanban/tasks/:taskId/time-stats
 * @desc    Get time tracking statistics for task
 * @access  Private
 */
router.get('/tasks/:taskId/time-stats', timeEntryController.getTaskTimeStats);

// ==========================================
// ATTACHMENT ROUTES
// ==========================================

/**
 * @route   GET /api/kanban/tasks/:taskId/attachments
 * @desc    Get all attachments for a task
 * @access  Private
 */
router.get('/tasks/:taskId/attachments', attachmentController.getTaskAttachments);

/**
 * @route   POST /api/kanban/tasks/:taskId/attachments
 * @desc    Upload attachment to task
 * @access  Private
 */
router.post('/tasks/:taskId/attachments', upload.single('file') as any, attachmentController.uploadAttachment);

/**
 * @route   GET /api/kanban/tasks/:taskId/attachments/:id
 * @desc    Get attachment by ID (with fresh presigned URL)
 * @access  Private
 */
router.get('/tasks/:taskId/attachments/:id', attachmentController.getAttachmentById);

/**
 * @route   GET /api/kanban/tasks/:taskId/attachments/:id/download
 * @desc    Download attachment
 * @access  Private
 */
router.get('/tasks/:taskId/attachments/:id/download', attachmentController.downloadAttachment);

/**
 * @route   DELETE /api/kanban/tasks/:taskId/attachments/:id
 * @desc    Delete attachment (only uploader)
 * @access  Private
 */
router.delete('/tasks/:taskId/attachments/:id', attachmentController.deleteAttachment);

/**
 * @route   GET /api/kanban/tasks/:taskId/storage-stats
 * @desc    Get storage statistics for task
 * @access  Private
 */
router.get('/tasks/:taskId/storage-stats', attachmentController.getTaskStorageStats);

/**
 * @route   GET /api/kanban/storage-stats
 * @desc    Get user's global storage statistics
 * @access  Private
 */
router.get('/storage-stats', attachmentController.getUserStorageStats);

/**
 * @route   POST /api/kanban/cleanup-orphaned-files
 * @desc    Cleanup orphaned files in R2 (admin only)
 * @access  Private (Admin)
 */
router.post('/cleanup-orphaned-files', attachmentController.cleanupOrphanedFiles);

export default router;
