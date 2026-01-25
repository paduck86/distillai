// API 키 및 사용 가능한 모델 테스트
// 실행: npx tsx test-gemini.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.');
  process.exit(1);
}

console.log('API Key (처음 10자):', apiKey.substring(0, 10) + '...');
console.log('API Key 길이:', apiKey.length);

const genAI = new GoogleGenerativeAI(apiKey);

// 모델 목록 조회
async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      console.error('❌ 모델 목록 조회 실패:', response.status, response.statusText);
      const error = await response.text();
      console.error('Error:', error);
      return;
    }

    const data = await response.json();
    console.log('\n✅ 사용 가능한 모델 목록:');
    data.models?.forEach((model: any) => {
      console.log(`  - ${model.name} (${model.displayName})`);
    });
  } catch (error) {
    console.error('❌ 모델 목록 조회 중 오류:', error);
  }
}

// 간단한 텍스트 생성 테스트
async function testGeneration() {
  console.log('\n텍스트 생성 테스트 중...');

  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-2.0-flash-exp',
  ];

  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "Hello" in Korean');
      const text = result.response.text();
      console.log(`✅ ${modelName}: 성공 - "${text.substring(0, 50)}..."`);
      return; // 하나라도 성공하면 중단
    } catch (error: any) {
      console.log(`❌ ${modelName}: 실패 - ${error.message?.substring(0, 100)}`);
    }
  }
}

async function main() {
  await listModels();
  await testGeneration();
}

main();
