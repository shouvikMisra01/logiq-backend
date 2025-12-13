// src/services/llmService.ts
/**
 * LLM Service for Question Generation
 */

import OpenAI from 'openai';
import { Question, LLMQuestionResponse, QuestionFeatures } from '../types/quiz';

export class LLMService {
  private static openaiClient: OpenAI | null = null;

  /**
   * Get OpenAI client instance
   */
  private static getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;

      // API Key validation
      if (!apiKey) {
        const errMsg = 'OPENAI_API_KEY environment variable is not set';
        console.error('[LLMService] Fatal error:', errMsg);
        throw new Error(errMsg);
      }

      if (apiKey.trim().length === 0) {
        const errMsg = 'OPENAI_API_KEY is empty';
        console.error('[LLMService] Fatal error:', errMsg);
        throw new Error(errMsg);
      }

      if (!apiKey.startsWith('sk-')) {
        const errMsg = 'OPENAI_API_KEY does not start with "sk-" (invalid format)';
        console.error('[LLMService] Fatal error:', errMsg);
        throw new Error(errMsg);
      }

      console.log('[LLMService] OpenAI client initialized with valid API key');
      this.openaiClient = new OpenAI({ apiKey });
    }
    return this.openaiClient;
  }

  /**
   * Compute difficulty from feature scores
   */
  static computeDifficulty(features: {
    memorization: number;
    reasoning: number;
    numerical: number;
    language: number;
  }): QuestionFeatures {
    // Equal weights for all features
    const weights = {
      memorization: 0.25,
      reasoning: 0.25,
      numerical: 0.25,
      language: 0.25,
    };

    // Normalize features to 0-1
    const normalized = {
      memorization: Math.max(0, Math.min(1, features.memorization)),
      reasoning: Math.max(0, Math.min(1, features.reasoning)),
      numerical: Math.max(0, Math.min(1, features.numerical)),
      language: Math.max(0, Math.min(1, features.language)),
    };

    // Calculate difficulty score (0-10)
    const difficultyRaw =
      normalized.memorization * weights.memorization +
      normalized.reasoning * weights.reasoning +
      normalized.numerical * weights.numerical +
      normalized.language * weights.language;

    const difficulty_score = parseFloat((difficultyRaw * 10).toFixed(2));
    const difficulty_level = this.difficultyToLevel(difficulty_score);

    return {
      ...normalized,
      difficulty_score,
      difficulty_level,
    };
  }

  /**
   * Convert difficulty score to level (1-10)
   */
  static difficultyToLevel(score: number): number {
    let level = Math.round(score);
    if (level < 1) level = 1;
    if (level > 10) level = 10;
    return level;
  }

  /**
   * Generate questions from chapter text using LLM
   */
  static async generateQuestionsFromText(
    chapterText: string,
    classId: string,
    subject: string,
    chapter: string,
    classNumber: number
  ): Promise<Question[]> {
    console.log('[LLMService] generateQuestionsFromText called:', {
      classId,
      subject,
      chapter,
      classNumber,
      textLength: chapterText.length,
    });

    // Input validation
    if (!chapterText || typeof chapterText !== 'string') {
      const errMsg = 'Chapter text must be a non-empty string';
      console.error('[LLMService] Input validation failed:', errMsg);
      throw new Error(errMsg);
    }

    const trimmedText = chapterText.trim();
    if (trimmedText.length < 100) {
      const errMsg = `Chapter text is too short (${trimmedText.length} chars). Minimum 100 characters required`;
      console.error('[LLMService] Input validation failed:', errMsg);
      throw new Error(errMsg);
    }

    const client = this.getOpenAIClient();

    // Determine class level description
    let classLevel = '';
    if (classNumber >= 1 && classNumber <= 5) {
      classLevel = 'primary school (simple language, basic concepts, foundational knowledge)';
    } else if (classNumber >= 6 && classNumber <= 8) {
      classLevel = 'middle school (moderate complexity, introduction to advanced topics)';
    } else if (classNumber >= 9 && classNumber <= 10) {
      classLevel = 'secondary school (CBSE board level, detailed concepts, application-based)';
    } else {
      classLevel = 'senior secondary (advanced concepts, analytical thinking)';
    }

    const systemPrompt = `You are an expert CBSE school teacher and assessment designer specializing in Class ${classNumber} (${classLevel}).

CRITICAL REQUIREMENTS:
1. Generate EXACTLY 10 multiple-choice questions
2. ALL questions MUST be directly from the provided chapter content
3. Questions MUST match Class ${classNumber} cognitive level and curriculum
4. Use age-appropriate language for Class ${classNumber} students
5. Questions should test understanding of the SPECIFIC topics covered in this chapter

QUESTION MIX (STRICT):
- At least 3 questions MUST be numerical/calculation-based (if applicable to subject)
  * Use realistic values appropriate for Class ${classNumber}
  * Ensure correct arithmetic and unique correct answer
  * For these, "numerical" >= 0.7 in features
- At least 3 questions MUST be reasoning-based conceptual questions
  * Test understanding, not just memorization
  * For these, "reasoning" >= 0.7 in features
- At least 2 questions MUST be pure memory/definition type
  * Important terms, definitions, facts from the chapter
  * For these, "memorization" >= 0.7 in features
- At least 2 questions MUST involve language/comprehension
  * Reading comprehension, interpretation
  * For these, "language" >= 0.7 in features

TOPIC RELEVANCE:
- Every question MUST be about topics explicitly covered in the chapter text
- Do NOT include questions about related topics not in this chapter
- Do NOT use overly simple or overly complex questions for Class ${classNumber}
- Incorrect options should be plausible but clearly wrong

For EACH question, provide:
  "id": "Q1", "Q2", ... "Q10"
  "question": Clear question text appropriate for Class ${classNumber}
  "options": [4 options - 1 correct, 3 plausible incorrect]
  "correct_option_index": int (0..3)
  "skills": list from ["reasoning","numerical","memory","language"]
  "features": {
    "memorization": 0.0–1.0 (how much memorization required),
    "reasoning": 0.0–1.0 (how much logical thinking required),
    "numerical": 0.0–1.0 (how much calculation required),
    "language": 0.0–1.0 (how much reading comprehension required)
  }

IMPORTANT:
- Features are intensities of cognitive demand, not probabilities
- Use decimal values (e.g., 0.3, 0.75)
- All numerical values must be mathematically correct
- For mathematical expressions, use LaTeX notation within $ delimiters:
  * IMPORTANT: In JSON strings, backslashes must be doubled: \\\\frac not \\frac
  * Inline math: $E = mc^2$
  * Fractions: $\\\\frac{numerator}{denominator}$
  * Superscripts: $x^2$ or $10^{-5}$
  * Subscripts: $H_2O$ or $CO_2$
  * Square roots: $\\\\sqrt{x}$ or $\\\\sqrt{x^2 + y^2}$
  * Greek letters: $\\\\alpha$, $\\\\beta$, $\\\\Delta$, etc.
  * Display math (centered): $$x = \\\\frac{-b \\\\pm \\\\sqrt{b^2-4ac}}{2a}$$
- For chemistry equations, use subscripts: $H_2O$, $CO_2$, $NaCl$, etc.
- Output ONLY valid JSON with properly escaped backslashes, no markdown, no explanations

Output format with LaTeX examples (note the double backslashes in JSON):
{
  "questions": [
    {
      "id": "Q1",
      "question": "What is the value of $x$ in the equation $2x + 5 = 13$?",
      "options": ["$x = 2$", "$x = 4$", "$x = 6$", "$x = 8$"],
      "correct_option_index": 1,
      "skills": ["reasoning","numerical"],
      "features": {
        "memorization": 0.3,
        "reasoning": 0.8,
        "numerical": 0.9,
        "language": 0.4
      }
    },
    {
      "id": "Q2",
      "question": "Solve for $x$: $\\\\frac{x}{4} = 5$",
      "options": ["$x = 1$", "$x = 9$", "$x = 20$", "$x = 25$"],
      "correct_option_index": 2,
      "skills": ["reasoning","numerical"],
      "features": {
        "memorization": 0.2,
        "reasoning": 0.7,
        "numerical": 0.8,
        "language": 0.3
      }
    },
    {
      "id": "Q3",
      "question": "Which gas is represented by the chemical formula $CO_2$?",
      "options": ["Oxygen", "Carbon dioxide", "Carbon monoxide", "Water"],
      "correct_option_index": 1,
      "skills": ["memory"],
      "features": {
        "memorization": 0.8,
        "reasoning": 0.2,
        "numerical": 0.0,
        "language": 0.3
      }
    }
  ]
}`;

    const userPrompt = `Class: ${classNumber} (${classId})
Subject: ${subject}
Chapter/Topic: ${chapter}

CHAPTER CONTENT:
"""
${chapterText.substring(0, 12000)}
"""

Generate EXACTLY 10 questions that:
1. Are ONLY about topics in this chapter content
2. Match Class ${classNumber} difficulty level
3. Follow the question mix requirements
4. Are relevant and appropriate for CBSE Class ${classNumber} ${subject}

Return ONLY the JSON with questions.`;

    try {
      console.log('[LLMService] Calling OpenAI API for question generation');
      let response;
      try {
        response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        });
      } catch (apiError: any) {
        // Network and API error handling
        console.error('[LLMService] OpenAI API error:', {
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

      // Response validation
      if (!response) {
        const errMsg = 'No response received from OpenAI API';
        console.error('[LLMService]', errMsg);
        throw new Error(errMsg);
      }

      if (!response.choices || response.choices.length === 0) {
        const errMsg = 'OpenAI response has no choices';
        console.error('[LLMService]', errMsg);
        throw new Error(errMsg);
      }

      let rawContent = response.choices[0].message.content;
      if (!rawContent) {
        const errMsg = 'Empty response content from OpenAI';
        console.error('[LLMService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[LLMService] Received response from OpenAI, length:', rawContent.length);

      // Clean up markdown code blocks
      rawContent = rawContent.trim();
      if (rawContent.startsWith('```')) {
        rawContent = rawContent.replace(/^```(?:json)?\\n?/, '').replace(/```$/, '').trim();
      }

      console.log('[LLMService] Raw content length before LaTeX fix:', rawContent.length);

      // Fix common LaTeX escaping issues in JSON strings
      // We need to ensure backslashes in LaTeX expressions are properly escaped for JSON
      // In JSON strings, a literal backslash needs to be \\
      // So \sqrt should become \\\\sqrt (4 backslashes) to represent \\sqrt after parsing
      let latexFixCount = 0;

      // First, let's try to parse as-is
      let needsFix = false;
      try {
        JSON.parse(rawContent);
        console.log('[LLMService] JSON is already valid, no LaTeX fix needed');
      } catch (e) {
        needsFix = true;
        console.log('[LLMService] JSON parse failed, attempting LaTeX fixes');
      }

      if (needsFix) {
        // Only apply fixes if JSON is invalid
        // Replace improperly escaped backslashes in LaTeX expressions
        rawContent = rawContent.replace(/\$\$([^$]+)\$\$/g, (match, content) => {
          // Display math: $$...$$ - ensure proper escaping
          // Replace single backslashes with double backslashes for JSON
          const fixed = content.replace(/\\([a-zA-Z]+)/g, '\\\\$1');
          if (fixed !== content) {
            console.log('[LLMService] Fixed display math:', content.substring(0, 50), '->', fixed.substring(0, 50));
            latexFixCount++;
          }
          return `$$${fixed}$$`;
        });

        rawContent = rawContent.replace(/\$([^$]+)\$/g, (match, content) => {
          // Inline math: $...$ - ensure proper escaping
          const fixed = content.replace(/\\([a-zA-Z]+)/g, '\\\\$1');
          if (fixed !== content) {
            console.log('[LLMService] Fixed inline math:', content.substring(0, 50), '->', fixed.substring(0, 50));
            latexFixCount++;
          }
          return `$${fixed}$`;
        });

        if (latexFixCount > 0) {
          console.log(`[LLMService] Applied LaTeX fixes to ${latexFixCount} expressions`);
        }
      }

      // JSON parsing with detailed error handling
      let data: LLMQuestionResponse;
      try {
        console.log('[LLMService] Attempting to parse JSON response');
        data = JSON.parse(rawContent);
      } catch (parseError: any) {
        console.error('[LLMService] JSON parsing failed');
        console.error('[LLMService] Parse error message:', parseError.message);
        console.error('[LLMService] First 500 chars of content:', rawContent.substring(0, 500));
        // Log a snippet of the content around the error position if available
        if (parseError.message.includes('position')) {
          const posMatch = parseError.message.match(/position (\d+)/);
          if (posMatch) {
            const pos = parseInt(posMatch[1]);
            const start = Math.max(0, pos - 100);
            const end = Math.min(rawContent.length, pos + 100);
            console.error('[LLMService] Context around parse error (pos', pos, '):', rawContent.substring(start, end));
          }
        }
        throw new Error(`Failed to parse LLM response as JSON: ${parseError.message}`);
      }

      // Question structure validation
      console.log('[LLMService] Validating question structure');
      if (!data || !Array.isArray(data.questions)) {
        const errMsg = 'Invalid response structure: missing or invalid "questions" array';
        console.error('[LLMService]', errMsg);
        throw new Error(errMsg);
      }

      if (data.questions.length === 0) {
        const errMsg = 'No questions generated in response';
        console.error('[LLMService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[LLMService] Response contains', data.questions.length, 'questions');

      const questions: Question[] = [];

      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];

        // Validate each question structure
        if (!q.id) {
          console.warn('[LLMService] Question', i, 'missing id');
        }
        if (!q.question) {
          console.warn('[LLMService] Question', i, 'missing question text');
        }
        if (!q.options || !Array.isArray(q.options) || q.options.length < 4) {
          console.warn('[LLMService] Question', i, 'has invalid options:', q.options?.length);
        }
        if (typeof q.correct_option_index !== 'number' || q.correct_option_index < 0 || q.correct_option_index > 3) {
          console.warn('[LLMService] Question', i, 'has invalid correct_option_index:', q.correct_option_index);
        }
        if (!q.features || typeof q.features !== 'object') {
          console.warn('[LLMService] Question', i, 'missing features');
        }

        const difficultyData = this.computeDifficulty(q.features);

        questions.push({
          id: q.id,
          question: q.question,
          options: q.options,
          correct_option_index: q.correct_option_index,
          skills: q.skills,
          features: difficultyData,
        });
      }

      console.log('[LLMService] Successfully generated', questions.length, 'questions');
      return questions;
    } catch (error: any) {
      console.error('[LLMService] Fatal error in generateQuestionsFromText:', error.message);
      throw new Error(`Failed to generate questions: ${error.message}`);
    }
  }

  /**
   * Generate study plan for student based on quiz history
   */
  static async generateStudyPlan(
    studentId: string,
    subjectFeatureMeans: Record<
      string,
      {
        memorization: number;
        reasoning: number;
        numerical: number;
        language: number;
      }
    >
  ): Promise<any> {
    const client = this.getOpenAIClient();

    const systemPrompt = `You are an expert CBSE tutor and academic planner.

You will receive:
- A student id (just an identifier)
- For each subject: average normalized skill scores in [0,1] for:
    - memorization
    - reasoning
    - numerical
    - language

Task:
- Design a detailed 7-day study plan focusing on weak skills (< 0.6) per subject.
- Use JSON format:

{
  "week_overview": "short text",
  "subjects": {
    "science": {
      "summary": "short text about this subject",
      "skills": {
        "memorization": 0.5,
        "reasoning": 0.7,
        "numerical": 0.4,
        "language": 0.8
      }
    }
  },
  "days": [
    {
      "day": "Monday",
      "tasks": [
        {
          "subject": "Science",
          "focus_skills": ["numerical","reasoning"],
          "chapter_hint": "optional text about chapters/topics",
          "activity": "Explain exactly what student should do.",
          "estimated_time_min": 40
        }
      ]
    }
  ]
}

Rules:
- If numerical < 0.6 → include more problem-solving tasks with specific hints.
- If memorization < 0.6 → include revision of formulas, key points, flashcards.
- If language < 0.6 → include reading comprehension, summary writing tasks.
- If reasoning < 0.6 → include conceptual why/how questions, comparison tasks.
- Keep total time per day around 90–120 minutes.
- Output ONLY valid JSON.`;

    const userPrompt = JSON.stringify(
      {
        student_id: studentId,
        subjects: subjectFeatureMeans,
      },
      null,
      2
    );

    try {
      console.log('[LLMService] Calling OpenAI API for study plan generation');
      let response;
      try {
        response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.4,
        });
      } catch (apiError: any) {
        console.error('[LLMService] OpenAI API error in generateStudyPlan:', {
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

      // Response validation
      if (!response || !response.choices || response.choices.length === 0) {
        const errMsg = 'Invalid response from OpenAI';
        console.error('[LLMService]', errMsg);
        throw new Error(errMsg);
      }

      let rawContent = response.choices[0].message.content;
      if (!rawContent) {
        const errMsg = 'Empty response content from OpenAI';
        console.error('[LLMService]', errMsg);
        throw new Error(errMsg);
      }

      console.log('[LLMService] Received study plan response, length:', rawContent.length);

      // Clean up markdown code blocks
      rawContent = rawContent.trim();
      if (rawContent.startsWith('```')) {
        rawContent = rawContent.replace(/^```(?:json)?\\n?/, '').replace(/```$/, '').trim();
      }

      // JSON parsing with error context
      let data;
      try {
        console.log('[LLMService] Parsing study plan JSON');
        data = JSON.parse(rawContent);
      } catch (parseError: any) {
        console.error('[LLMService] Failed to parse study plan JSON');
        console.error('[LLMService] Error:', parseError.message);
        console.error('[LLMService] First 300 chars:', rawContent.substring(0, 300));
        throw new Error(`Failed to parse study plan JSON: ${parseError.message}`);
      }

      console.log('[LLMService] Study plan generated successfully');
      return data;
    } catch (error: any) {
      console.error('[LLMService] Fatal error in generateStudyPlan:', error.message);
      throw new Error(`Failed to generate study plan: ${error.message}`);
    }
  }
}
