// src/services/openaiService.ts
/**
 * OpenAI Service - Replaces Groq
 */

import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return parsed;
    } catch (error: any) {
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
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);

      // Handle both array and object with questions key
      const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

      return questions.slice(0, count);
    } catch (error: any) {
      throw new Error(`Failed to generate questions: ${error.message}`);
    }
  }
}
