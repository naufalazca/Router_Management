import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export class BoardListService {
  /**
   * Verify board ownership
   */
  private async verifyBoardOwnership(boardId: string, userId: string) {
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
    });

    if (!board) {
      throw new Error('Board not found or access denied');
    }

    return board;
  }

  /**
   * Get all lists for a board
   */
  async getBoardLists(boardId: string, userId: string) {
    await this.verifyBoardOwnership(boardId, userId);

    return prisma.boardList.findMany({
      where: {
        boardId,
        isArchived: false,
      },
      include: {
        tasks: {
          where: { isArchived: false },
          orderBy: { position: 'asc' },
          include: {
            taskLabels: {
              include: { label: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Create a new list
   */
  async createBoardList(
    boardId: string,
    userId: string,
    data: Omit<Prisma.BoardListCreateInput, 'board'>
  ) {
    await this.verifyBoardOwnership(boardId, userId);

    // Get max position
    const maxPosition = await prisma.boardList.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = (maxPosition?.position ?? -1) + 1;

    return prisma.boardList.create({
      data: {
        ...data,
        position: newPosition,
        board: { connect: { id: boardId } },
      },
    });
  }

  /**
   * Update list
   */
  async updateBoardList(
    listId: string,
    boardId: string,
    userId: string,
    data: Prisma.BoardListUpdateInput
  ) {
    await this.verifyBoardOwnership(boardId, userId);

    const list = await prisma.boardList.findFirst({
      where: { id: listId, boardId },
    });

    if (!list) {
      throw new Error('List not found');
    }

    return prisma.boardList.update({
      where: { id: listId },
      data,
    });
  }

  /**
   * Delete list (soft delete)
   */
  async deleteBoardList(listId: string, boardId: string, userId: string) {
    await this.verifyBoardOwnership(boardId, userId);

    const list = await prisma.boardList.findFirst({
      where: { id: listId, boardId },
    });

    if (!list) {
      throw new Error('List not found');
    }

    return prisma.boardList.update({
      where: { id: listId },
      data: { isArchived: true },
    });
  }

  /**
   * Reorder lists
   */
  async reorderLists(boardId: string, userId: string, listIds: string[]) {
    await this.verifyBoardOwnership(boardId, userId);

    // Verify all lists belong to board
    const lists = await prisma.boardList.findMany({
      where: { id: { in: listIds }, boardId },
    });

    if (lists.length !== listIds.length) {
      throw new Error('Some lists not found');
    }

    return prisma.$transaction(
      listIds.map((listId, index) =>
        prisma.boardList.update({
          where: { id: listId },
          data: { position: index },
        })
      )
    );
  }
}

export default new BoardListService();
