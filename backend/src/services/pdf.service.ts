import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * PDF 파일에서 텍스트를 추출합니다.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF일 수 있습니다.');
    }

    // 텍스트 정제: 불필요한 공백 제거
    const cleanedText = data.text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log(`PDF text extracted. Pages: ${data.numpages}, Characters: ${cleanedText.length}`);

    return cleanedText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`PDF 텍스트 추출 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * PDF 메타데이터 추출
 */
export async function getPdfMetadata(buffer: Buffer): Promise<{
  pages: number;
  title?: string;
  author?: string;
}> {
  try {
    const data = await pdfParse(buffer);
    return {
      pages: data.numpages,
      title: data.info?.Title,
      author: data.info?.Author,
    };
  } catch (error) {
    console.error('PDF metadata extraction error:', error);
    return { pages: 0 };
  }
}
