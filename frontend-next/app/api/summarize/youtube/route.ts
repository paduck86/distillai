import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch YouTube captions using a public API
async function fetchYoutubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Try fetching from youtube-transcript API
    const response = await fetch(
      `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`
    );

    if (!response.ok) {
      console.error('Failed to fetch transcript:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return data.map((item: { text: string }) => item.text).join(' ');
    }

    return null;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Fetch transcript
    const transcript = await fetchYoutubeTranscript(videoId);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Could not fetch video transcript. Make sure the video has captions enabled.' },
        { status: 400 }
      );
    }

    // Generate summary using AI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are an expert at summarizing educational content.
Create a detailed, structured summary in Korean with the following format:

# 제목
[영상의 핵심 주제]

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
      prompt: `Please summarize the following video transcript:\n\n${transcript.slice(0, 100000)}`,
    });

    return NextResponse.json({
      summary: text,
      videoId,
      transcriptLength: transcript.length,
    });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
