import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export class BoardService {
  /**
   * Get all boards for a user
   */
  async getUserBoards(userId: string) {
    return prisma.board.findMany({
      where: {
        userId,
        isArchived: false,
      },
      include: {
        lists: {
          where: { isArchived: false },
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              where: { isArchived: false },
              orderBy: { position: 'asc' },
              include: {
                taskLabels: {
                  include: {
                    label: true,
                  },
                },
              },
            },
          },
        },
        labels: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            lists: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Get board by ID with full details
   */
  async getBoardById(boardId: string, userId: string) {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        userId, // Ensure user owns the board
      },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: {
                taskLabels: {
                  include: {
                    label: true,
                  },
                },
                router: {
                  select: {
                    id: true,
                    name: true,
                    ipAddress: true,
                  },
                },
                _count: {
                  select: {
                    comments: true,
                    attachments: true,
                    timeEntries: true,
                  },
                },
              },
            },
          },
        },
        labels: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!board) {
      throw new Error('Board not found or access denied');
    }

    return board;
  }

  /**
   * Create a new board
   */
  async createBoard(
    userId: string,
    data: { name: string; description?: string; color?: string; icon?: string }
  ) {
    // Get current max position
    const maxPosition = await prisma.board.findFirst({
      where: { userId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = (maxPosition?.position ?? -1) + 1;

    return prisma.board.create({
      data: {
        ...data,
        userId,
        position: newPosition,
      },
      include: {
        lists: true,
        labels: true,
      },
    });
  }

  /**
   * Update board
   */
  async updateBoard(boardId: string, userId: string, data: Prisma.BoardUpdateInput) {
    // Check ownership
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
    });

    if (!board) {
      throw new Error('Board not found or access denied');
    }

    return prisma.board.update({
      where: { id: boardId },
      data,
      include: {
        lists: true,
        labels: true,
      },
    });
  }

  /**
   * Delete board (soft delete by archiving)
   */
  async deleteBoard(boardId: string, userId: string) {
    // Check ownership
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
    });

    if (!board) {
      throw new Error('Board not found or access denied');
    }

    return prisma.board.update({
      where: { id: boardId },
      data: { isArchived: true },
    });
  }

  /**
   * Permanently delete board
   */
  async permanentlyDeleteBoard(boardId: string, userId: string) {
    // Check ownership
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
    });

    if (!board) {
      throw new Error('Board not found or access denied');
    }

    return prisma.board.delete({
      where: { id: boardId },
    });
  }

  /**
   * Reorder boards
   */
  async reorderBoards(userId: string, boardIds: string[]) {
    // Verify all boards belong to user
    const boards = await prisma.board.findMany({
      where: {
        id: { in: boardIds },
        userId,
      },
    });

    if (boards.length !== boardIds.length) {
      throw new Error('Some boards not found or access denied');
    }

    // Update positions in transaction
    return prisma.$transaction(
      boardIds.map((boardId, index) =>
        prisma.board.update({
          where: { id: boardId },
          data: { position: index },
        })
      )
    );
  }

  /**
   * Get archived boards
   */
  async getArchivedBoards(userId: string) {
    return prisma.board.findMany({
      where: {
        userId,
        isArchived: true,
      },
      include: {
        _count: {
          select: {
            lists: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Restore archived board
   */
  async restoreBoard(boardId: string, userId: string) {
    // Check ownership
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId, isArchived: true },
    });

    if (!board) {
      throw new Error('Archived board not found or access denied');
    }

    return prisma.board.update({
      where: { id: boardId },
      data: { isArchived: false },
    });
  }
}

export default new BoardService();
