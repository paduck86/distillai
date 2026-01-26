import type { Request, Response, NextFunction } from 'express';
import * as chatService from '../services/chat.service.js';
import * as lectureService from '../services/lecture.service.js';
import * as aiService from '../services/gemini.service.js';
import type { CreateChatMessage } from '../types/index.js';

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { distillationId, content }: CreateChatMessage = req.body;

    // Get distillation for context
    const distillation = await lectureService.getLecture(userId, distillationId);

    // Get chat history for context
    const history = await chatService.getChatHistory(userId, distillationId, 10);

    // Save user message
    await chatService.saveMessage(userId, distillationId, 'user', content);

    // Generate AI response
    const response = await aiService.chat({
      lectureTitle: distillation.title,
      lectureSummary: distillation.summaryMd ?? '',
      lectureTranscript: distillation.fullTranscript ?? '',
      chatHistory: history,
      userMessage: content,
    });

    // Save assistant message
    const assistantMessage = await chatService.saveMessage(
      userId,
      distillationId,
      'assistant',
      response.content,
      response.model,
      response.tokensUsed
    );

    res.json({ data: assistantMessage });
  } catch (error) {
    next(error);
  }
}

export async function getChatHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const distillationId = req.params.distillationId!;

    // Verify distillation access
    await lectureService.getLecture(userId, distillationId);

    const messages = await chatService.getChatHistory(userId, distillationId);

    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
}

export async function clearChatHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const distillationId = req.params.distillationId!;

    // Verify distillation access
    await lectureService.getLecture(userId, distillationId);

    await chatService.clearChatHistory(userId, distillationId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
