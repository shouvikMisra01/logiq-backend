// src/services/openaiService.ts
/**
 * OpenAI Service - Replaces Groq
 */

import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

/**
 * Validate and retrieve OpenAI API key from environment
 */
function validateAndGetApiKey(): string {
  console.log('[OpenAIService] Validating OpenAI API key');
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const errMsg = 'OPENAI_API_KEY environment variable is not set';
    console.error('[OpenAIService] Fatal error:', errMsg);
    throw new Error(errMsg);
  }

  if (apiKey.trim().length === 0) {
    const errMsg = 'OPENAI_API_KEY is empty';
    console.error('[OpenAIService] Fatal error:', errMsg);
    throw new Error(errMsg);
  }

  if (!apiKey.startsWith('sk-')) {
    const errMsg = 'OPENAI_API_KEY does not start with "sk-" (invalid format)';
    console.error('[OpenAIService] Fatal error:', errMsg);
    throw new Error(errMsg);
  }

  console.log('[OpenAIService] API key validation successful');
  return apiKey;
}

// Validate API key at module load time
const validatedApiKey = validateAndGetApiKey();

const openai = new OpenAI({
  apiKey: validatedApiKey,
});

export class OpenAIService {
  /**
   * Parse PDF text into structured syllabus using GPT
   */
  static async parseSyllabusFromText(
    pdfText: string,
    classHint?: string,
    subjectHint?: string
  ): Promise<{
    classLabel: string;
    classNumber: number;
    subjectName: string;
    chapters: Array<{
      chapterId: string;
      chapterName: string;
      topics: Array<{ topicId: string; topicName: string }>;
    }>;
  }> {
    const systemPrompt = `You are an expert curriculum analyzer for educational content.

Your task:
1. Read the provided PDF text (textbook/syllabus/notes)
2. Detect the class/grade and subject
3. Divide the content into logical chapters
4. For each chapter, extract topics
5. Return structured JSON

Output format (MUST be valid JSON):
{
  "classLabel": "Class 8",
  "classNumber": 8,
  "subjectName": "Mathematics",
  "chapters": [
    {
      "chapterId": "ch1",
      "chapterName": "Linear Equations",
      "topics": [
        { "topicId": "t1", "topicName": "Introduction to Linear Equations" },
        { "topicId": "t2", "topicName": "Solving Linear Equations" }
      ]
    }
  ]
}

Rules:
- Extract 3-15 chapters from full books
- Each chapter should have 2-8 topics
- Generate IDs like "ch1", "ch2" and "t1", "t2"
- Use clear, concise names
- Output ONLY valid JSON, no markdown, no explanations`;

    const userPrompt = `${classHint ? `Class Hint: ${classHint}\n` : ''}${
      subjectHint ? `Subject Hint: ${subjectHint}\n` : ''
    }
PDF Content (first 12000 chars):
"""
${pdfText.substring(0, 12000)}
"""

Parse and return structured JSON.`;

    try {
      console.log('[OpenAIService] Calling OpenAI API for syllabus parsing');
      let response;
      try {
        response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        });
      } catch (apiError: any) {
        console.error('[OpenAIService] OpenAI API error in parseSyllabusFromText:', {
          status: apiError.status,
          code: apiError.code,
          message: apiError.message,
        });

        if (apiError.status === 401) {
          throw new Error('OpenAI authentication failed (401): Invalid or expired API key');
        } else if (apiError.status === 429) {
          throw new Error('OpenAI rate limit exceeded (429): Too many requests, please retry later');
        } else if (apiError.status === 500) {
          throw new Error('OpenAI server error (500): Service temporarily unavailable');
        } else if (apiError.status === 503) {
          throw new Error('OpenAI service unavailable (503): Service is down for maintenance');
        } else if (apiError.code === 'ENOTFOUND') {
          throw new Error('Network error: Cannot reach OpenAI service (DNS resolution failed)');
        } else if (apiError.code === 'ECONNREFUSED') {
          throw new Error('Network error: Connection refused by OpenAI service');
        }
        throw apiError;
      }

      if (!response || !response.choices || response.choices.length === 0) {
        const errMsg = 'Invalid response from OpenAI';
        console.error('[OpenAIService]', errMsg);
        throw new Error(errMsg);
      }

      const content = response.choices[0].message.content;
      if (!content) {
        const errMsg = 'Empty response content from OpenAI';
        console.error('[OpenAIService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[OpenAIService] Received syllabus response, parsing JSON');
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError: any) {
        console.error('[OpenAIService] JSON parse error:', parseError.message);
        throw new Error(`Failed to parse response JSON: ${parseError.message}`);
      }

      console.log('[OpenAIService] Syllabus parsed successfully');
      return parsed;
    } catch (error: any) {
      console.error('[OpenAIService] Fatal error in parseSyllabusFromText:', error.message);
      throw new Error(`Failed to parse syllabus with AI: ${error.message}`);
    }
  }

  /**
   * Generate quiz questions using GPT
   */
  static async generateQuestions(
    chapterText: string,
    classLabel: string,
    subjectName: string,
    chapterName: string,
    topicName?: string,
    count: number = 10
  ): Promise<
    Array<{
      id: string;
      content: string;
      type: 'mcq';
      options: string[];
      correctOptionIndex: number;
      difficulty: 'easy' | 'medium' | 'hard';
      classLabel: string;
      subjectName: string;
      chapterName: string;
      topicName?: string;
    }>
  > {
    const systemPrompt = `You are an expert question generator for ${classLabel} ${subjectName}.

Generate exactly ${count} multiple-choice questions (MCQs) based on the chapter content.

Each question MUST have:
- 4 answer options
- Exactly ONE correct answer (specified by correctOptionIndex 0-3)
- Difficulty level (easy, medium, or hard)
- Question type = "mcq"

Return ONLY valid JSON array, no markdown:
[
  {
    "id": "q1",
    "content": "What is the definition of a linear equation?",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 1,
    "difficulty": "easy",
    "classLabel": "${classLabel}",
    "subjectName": "${subjectName}",
    "chapterName": "${chapterName}"${topicName ? `, "topicName": "${topicName}"` : ''}
  }
]`;

    const userPrompt = `Chapter: ${chapterName}
${topicName ? `Topic: ${topicName}\n` : ''}
Content:
"""
${chapterText.substring(0, 8000)}
"""

Generate exactly ${count} MCQ questions as JSON array.`;

    try {
      console.log('[OpenAIService] Calling OpenAI API for question generation');
      let response;
      try {
        response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        });
      } catch (apiError: any) {
        console.error('[OpenAIService] OpenAI API error in generateQuestions:', {
          status: apiError.status,
          code: apiError.code,
          message: apiError.message,
        });

        if (apiError.status === 401) {
          throw new Error('OpenAI authentication failed (401): Invalid or expired API key');
        } else if (apiError.status === 429) {
          throw new Error('OpenAI rate limit exceeded (429): Too many requests, please retry later');
        } else if (apiError.status === 500) {
          throw new Error('OpenAI server error (500): Service temporarily unavailable');
        } else if (apiError.status === 503) {
          throw new Error('OpenAI service unavailable (503): Service is down for maintenance');
        } else if (apiError.code === 'ENOTFOUND') {
          throw new Error('Network error: Cannot reach OpenAI service (DNS resolution failed)');
        } else if (apiError.code === 'ECONNREFUSED') {
          throw new Error('Network error: Connection refused by OpenAI service');
        }
        throw apiError;
      }

      if (!response || !response.choices || response.choices.length === 0) {
        const errMsg = 'Invalid response from OpenAI';
        console.error('[OpenAIService]', errMsg);
        throw new Error(errMsg);
      }

      const content = response.choices[0].message.content;
      if (!content) {
        const errMsg = 'Empty response content from OpenAI';
        console.error('[OpenAIService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[OpenAIService] Received questions response, parsing JSON');
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError: any) {
        console.error('[OpenAIService] JSON parse error:', parseError.message);
        throw new Error(`Failed to parse response JSON: ${parseError.message}`);
      }

      // Handle both array and object with questions key
      const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

      if (questions.length === 0) {
        console.warn('[OpenAIService] No questions found in response');
      }

      console.log('[OpenAIService] Generated', questions.length, 'questions');
      return questions.slice(0, count);
    } catch (error: any) {
      console.error('[OpenAIService] Fatal error in generateQuestions:', error.message);
      throw new Error(`Failed to generate questions: ${error.message}`);
    }
  }
}
