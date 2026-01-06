/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { ModelConverter } from './converter.js';
import type { GenerateContentParameters } from '@google/genai';

describe('ModelConverter.toOpenAIMessages', () => {
  it('should convert inline image parts in user messages to OpenAI image_url', () => {
    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: '识别图片' },
            { inlineData: { mimeType: 'image/png', data: 'abc' } },
          ],
        },
      ],
      config: { systemInstruction: 'sys' },
    } as unknown as GenerateContentParameters;

    const messages = ModelConverter.toOpenAIMessages(request);
    expect(messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: '识别图片' },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,abc' },
          },
        ],
      },
    ]);
  });

  it('should convert inline image parts that follow function responses', () => {
    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                id: 'call-1',
                name: 'read_file',
                response: { output: 'Binary content of type image/png was processed.' },
              },
            },
            { inlineData: { mimeType: 'image/png', data: 'abc' } },
          ],
        },
      ],
      config: { systemInstruction: 'sys' },
    } as unknown as GenerateContentParameters;

    const messages = ModelConverter.toOpenAIMessages(request);
    expect(messages).toEqual([
      { role: 'system', content: 'sys' },
      {
        role: 'tool',
        tool_call_id: 'call-1',
        content: 'Binary content of type image/png was processed.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,abc' },
          },
        ],
      },
    ]);
  });
});

