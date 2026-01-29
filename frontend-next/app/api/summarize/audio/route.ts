import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Convert File to blob for OpenAI API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe audio using Whisper
    const transcription = await openaiClient.audio.transcriptions.create({
      file: new File([buffer], audioFile.name, { type: audioFile.type }),
      model: "whisper-1",
      language: "ko",
      response_format: "verbose_json",
    });

    const transcript = transcription.text;

    if (!transcript) {
      return NextResponse.json(
        { error: 'Could not transcribe audio' },
        { status: 400 }
      );
    }

    // Generate summary using AI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are an expert at summarizing audio content like lectures, meetings, and podcasts.
Create a detailed, structured summary in Korean with the following format:

# 제목
[콘텐츠의 핵심 주제를 파악하여 제목 생성]

## 핵심 내용
[주요 내용을 bullet point로 정리]

## 상세 요약
[각 섹션별 상세 내용]

### [섹션 1]
- 주요 포인트
- 상세 설명

### [섹션 2]
...

## 결론 및 인사이트
[전체 내용을 종합한 결론과 핵심 인사이트]

Keep the summary comprehensive but concise. Use Korean language.`,
      prompt: `Please summarize the following audio transcript:\n\n${transcript}`,
    });

    return NextResponse.json({
      summary: text,
      transcript,
      duration: (transcription as any).duration || null,
    });
  } catch (error) {
    console.error('Audio summarization error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}
