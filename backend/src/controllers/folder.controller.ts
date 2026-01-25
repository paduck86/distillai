import type { Request, Response, NextFunction } from 'express';
import * as folderService from '../services/folder.service.js';
import type { CreateFolder, UpdateFolder } from '../types/index.js';

export async function getFolders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const folders = await folderService.getFolders(userId);

    res.json({ data: folders });
  } catch (error) {
    next(error);
  }
}

export async function getFolder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;
    const folder = await folderService.getFolder(userId, id);

    res.json({ data: folder });
  } catch (error) {
    next(error);
  }
}

export async function createFolder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data: CreateFolder = req.body;
    const folder = await folderService.createFolder(userId, data);

    res.status(201).json({ data: folder });
  } catch (error) {
    next(error);
  }
}

export async function updateFolder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;
    const data: UpdateFolder = req.body;
    const folder = await folderService.updateFolder(userId, id, data);

    res.json({ data: folder });
  } catch (error) {
    next(error);
  }
}

export async function deleteFolder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;
    await folderService.deleteFolder(userId, id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
