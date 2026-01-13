/**
 * @fileoverview Vocalize MD - A VS Code extension that converts Markdown files to speech
 * using Deepgram TTS and Gemini AI (via OpenRouter) for intelligent text processing.
 * @module extension
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Reference to the active webview panel for audio playback.
 * Null when no panel is open.
 */
let panel: vscode.WebviewPanel | null = null;

/**
 * Prompt configuration for Gemini AI to convert Markdown to readable plain text.
 * Defines conversion rules, evaluation criteria, and output formatting requirements.
 * @constant
 */
const GEMINI_PROMPT = {
    agent_name: "MarkdownToReadableText",
    model_target: "Gemini",
    role: "You are a deterministic document conversion agent.",
    objective: "Convert an open-source project Markdown file into fully readable, detailed plain text without losing any information, while removing all Markdown-specific syntax.",
    input: { type: "markdown_file", description: "A Markdown (.md) file from an open-source project." },
    output: { type: "plain_text", formatting: "No Markdown, no code blocks, no tables, no symbols.", language: "Same language as input" },
    conversion_rules: {
        information_preservation: { rule: "All meaning, instructions, warnings, and descriptions must be preserved exactly.", restriction: "Do not summarize, compress, or omit content." },
        markdown_removal: { rule: "Remove all Markdown syntax entirely.", includes: ["Headings (#)", "Bold and italics (*, **, _, __)", "Inline code and code fences (`)", "Blockquotes", "Horizontal rules", "Markdown links"] },
        headings: { rule: "Convert headings into natural section introductions using plain sentences.", restriction: "Do not use symbols or formatting to indicate hierarchy." },
        lists: { rule: "Convert bullet points and numbered lists into coherent sentences or paragraphs.", restriction: "Preserve original order and hierarchy." },
        links: { rule: "Render links as readable text followed by the full URL written in plain text.", example: "Project homepage available at https://example.com" },
        code_handling: { rule: "Bypass all code reading and interpretation.", code_blocks: "Replace each code block with: 'Code example omitted for readability.'", inline_code: "Rewrite inline code as normal text without explanation." },
        tables: { rule: "Do not convert or summarize tables.", replacement_text: "See yourself." },
        tone_and_style: { tone: "Professional, neutral, documentation-grade", disallowed: ["Emojis", "Opinions", "Marketing language", "Speculation"] },
        content_restrictions: { no_added_content: true, no_external_knowledge: true, no_assumptions: true }
    },
    evaluation_rules: {
        syntax_check: { must_not_contain: ["#", "*", "_", "`", "|", "[", "]", "```"] },
        information_integrity: { requirement: "Every non-code, non-table concept from the original file must appear in the output.", failure_condition: "Missing instructions, steps, warnings, or explanations." },
        code_compliance: { requirement: "No code content appears in output.", allowed_phrase: "Code example omitted for readability." },
        table_compliance: { requirement: "Every table is replaced with exactly the phrase 'See yourself.'", failure_condition: "Any table data appears in output." },
        format_validation: { requirement: "Output is plain text only.", failure_condition: "Any Markdown formatting or structural symbols remain." },
        language_consistency: { requirement: "Output language matches input language." }
    },
    execution_mode: "strict",
    failure_behavior: "If any rule cannot be satisfied, regenerate the output until all evaluation rules pass."
};

/**
 * Extension configuration interface.
 * Contains API keys and voice settings retrieved from VS Code settings.
 */
interface Config {
    /** Deepgram API key for text-to-speech conversion */
    deepgramApiKey: string;
    /** OpenRouter API key for accessing Gemini AI */
    openrouterApiKey: string;
    /** AssemblyAI API key for speech-to-text transcription with timestamps */
    assemblyaiApiKey: string;
    /** Whether to use AssemblyAI for accurate timestamps */
    useAssemblyAI: boolean;
    /** Voice model identifier for Deepgram TTS */
    voice: string;
}

/**
 * Retrieves the current extension configuration from VS Code settings.
 * @returns {Config} The current configuration object with API keys and voice settings
 */
function getConfig(): Config {
    const cfg = vscode.workspace.getConfiguration('vocalizeMd');
    return {
        deepgramApiKey: cfg.get('deepgramApiKey') || '',
        openrouterApiKey: cfg.get('openrouterApiKey') || '',
        assemblyaiApiKey: cfg.get('assemblyaiApiKey') || '',
        useAssemblyAI: cfg.get('useAssemblyAI') || false,
        voice: cfg.get('voice') || 'aura-asteria-en'
    };
}

/**
 * Activates the Vocalize MD extension.
 * Registers the speak command that converts the active Markdown document to speech.
 * @param {vscode.ExtensionContext} context - The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
    const speakCmd = vscode.commands.registerCommand('vocalizeMd.speak', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.window.showWarningMessage('Open a markdown file first');
            return;
        }

        const config = getConfig();
        
        if (!config.openrouterApiKey) {
            const action = await vscode.window.showWarningMessage('OpenRouter API key required', 'Open Settings');
            if (action) vscode.commands.executeCommand('workbench.action.openSettings', 'vocalizeMd.openrouterApiKey');
            return;
        }
        
        if (!config.deepgramApiKey) {
            const action = await vscode.window.showWarningMessage('Deepgram API key required', 'Open Settings');
            if (action) vscode.commands.executeCommand('workbench.action.openSettings', 'vocalizeMd.deepgramApiKey');
            return;
        }

        // Create or reveal panel
        if (panel) {
            panel.reveal(vscode.ViewColumn.Beside);
        } else {
            panel = createPanel(context);
        }

        const markdown = editor.document.getText();

        try {
            // Step 1: Clean with Gemini via OpenRouter
            panel.webview.postMessage({ type: 'status', message: 'Converting markdown with Gemini...' });
            const cleanText = await convertWithGemini(markdown, config.openrouterApiKey);

            if (!cleanText.trim()) {
                panel.webview.postMessage({ type: 'error', message: 'No readable text found' });
                return;
            }

            // Step 2: Generate speech with Deepgram
            panel.webview.postMessage({ type: 'status', message: 'Generating speech with Deepgram...' });
            const result = await generateSpeech(cleanText, config.deepgramApiKey, config.voice);

            // Step 3: Optionally transcribe audio with AssemblyAI for accurate word timestamps
            let words: WordTiming[] = result.words;
            let useAccurateTimestamps = false;
            
            if (config.useAssemblyAI && config.assemblyaiApiKey) {
                panel.webview.postMessage({ type: 'status', message: 'Getting word timestamps from AssemblyAI...' });
                try {
                    words = await transcribeWithAssemblyAI(result.audio, config.assemblyaiApiKey);
                    useAccurateTimestamps = true;
                } catch (err) {
                    // Fall back to Deepgram timings if AssemblyAI fails
                    console.warn('AssemblyAI transcription failed, using Deepgram timings:', err);
                }
            }

            // Step 4: Send to panel for playback with word timings
            panel.webview.postMessage({
                type: 'ready',
                text: cleanText,
                audio: result.audio,
                words: words,
                useAccurateTimestamps: useAccurateTimestamps,
                apiStatus: {
                    deepgram: !!config.deepgramApiKey,
                    openrouter: !!config.openrouterApiKey,
                    assemblyai: config.useAssemblyAI && !!config.assemblyaiApiKey
                }
            });

        } catch (err) {
            panel.webview.postMessage({ type: 'error', message: String(err) });
        }
    });

    context.subscriptions.push(speakCmd);
}

/**
 * Creates and configures the webview panel for audio playback.
 * Loads the HTML and CSS from the media folder and sets up message handling.
 * @param {vscode.ExtensionContext} context - The extension context for accessing extension resources
 * @returns {vscode.WebviewPanel} The configured webview panel
 */
function createPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
    const p = vscode.window.createWebviewPanel(
        'vocalizeMd',
        '🔊 Vocalize MD',
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true }
    );

    const htmlPath = path.join(context.extensionPath, 'media', 'panel.html');
    const cssPath = path.join(context.extensionPath, 'media', 'panel.css');
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');
    html = html.replace('{{CSS}}', css);

    p.webview.html = html;

    p.webview.onDidReceiveMessage(msg => {
        if (msg.command === 'openSettings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'vocalizeMd');
        }
    });

    p.onDidDispose(() => { panel = null; });
    return p;
}

/**
 * Converts Markdown content to readable plain text using Gemini AI via OpenRouter.
 * Implements exponential backoff retry logic for rate limiting (429) errors.
 * @param {string} markdown - The Markdown content to convert
 * @param {string} apiKey - The OpenRouter API key for authentication
 * @param {number} [retries=3] - Maximum number of retry attempts for rate limiting
 * @returns {Promise<string>} The converted plain text suitable for TTS
 * @throws {Error} If the API request fails after all retry attempts
 */
async function convertWithGemini(markdown: string, apiKey: string, retries = 3): Promise<string> {
    const prompt = `${JSON.stringify(GEMINI_PROMPT)}\n\n---\n\nMarkdown file to convert:\n\n${markdown}`;
    
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const result = await openrouterRequest(prompt, apiKey);
            return result;
        } catch (err: unknown) {
            const errMsg = String(err);
            if (errMsg.includes('429') && attempt < retries - 1) {
                const delay = Math.pow(2, attempt + 1) * 1000;
                await sleep(delay);
                continue;
            }
            throw err;
        }
    }
    throw new Error('OpenRouter API failed after retries');
}

/**
 * Creates a promise that resolves after a specified delay.
 * Used for implementing exponential backoff in retry logic.
 * @param {number} ms - The delay duration in milliseconds
 * @returns {Promise<void>} A promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Makes an HTTP request to the OpenRouter API to process text with Gemini.
 * @param {string} prompt - The prompt to send to the Gemini model
 * @param {string} apiKey - The OpenRouter API key for authentication
 * @returns {Promise<string>} The response text from Gemini
 * @throws {string} Error message if the request fails or returns an error status
 */
function openrouterRequest(prompt: string, apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [{ role: 'user', content: prompt }]
        });
        
        const req = https.request({
            hostname: 'openrouter.ai',
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    reject('429 rate limited');
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(`OpenRouter API error: ${res.statusCode}`);
                    return;
                }
                try {
                    const json = JSON.parse(body);
                    const text = json.choices?.[0]?.message?.content?.trim();
                    if (text) resolve(text);
                    else reject('OpenRouter returned empty response');
                } catch { reject('Failed to parse OpenRouter response'); }
            });
        });
        
        req.on('error', e => reject(`OpenRouter request failed: ${e.message}`));
        req.write(data);
        req.end();
    });
}

/**
 * Word timing information from Deepgram TTS response.
 * Used for synchronized text highlighting during audio playback.
 */
interface WordTiming {
    /** The spoken word */
    word: string;
    /** Start time in seconds from the beginning of the audio */
    start: number;
    /** End time in seconds from the beginning of the audio */
    end: number;
}

/**
 * Result of speech generation containing audio data and word timings.
 */
interface SpeechResult {
    /** Base64-encoded MP3 audio data */
    audio: string;
    /** Array of word timing information for text synchronization */
    words: WordTiming[];
}

/**
 * Maximum character length for each text chunk sent to Deepgram TTS.
 * Text longer than this is split into multiple chunks.
 * @constant
 */
const CHUNK_SIZE = 1800;

/**
 * Generates speech audio from text using the Deepgram TTS API.
 * Handles long text by splitting into chunks and concatenating results.
 * @param {string} text - The text to convert to speech
 * @param {string} apiKey - The Deepgram API key for authentication
 * @param {string} voice - The voice model identifier (e.g., 'aura-asteria-en')
 * @returns {Promise<SpeechResult>} The generated audio and word timing information
 * @throws {Error} If the Deepgram API request fails
 */
async function generateSpeech(text: string, apiKey: string, voice: string): Promise<SpeechResult> {
    const chunks = splitIntoChunks(text, CHUNK_SIZE);
    const audioBuffers: Buffer[] = [];
    const allWords: WordTiming[] = [];
    let timeOffset = 0;
    
    for (const chunk of chunks) {
        const result = await generateChunk(chunk, apiKey, voice);
        audioBuffers.push(result.audio);
        
        // Offset word timings for concatenated chunks
        for (const word of result.words) {
            allWords.push({
                word: word.word,
                start: word.start + timeOffset,
                end: word.end + timeOffset
            });
        }
        
        // Update offset based on last word's end time
        if (result.words.length > 0) {
            timeOffset = allWords[allWords.length - 1].end;
        }
    }
    
    return {
        audio: Buffer.concat(audioBuffers).toString('base64'),
        words: allWords
    };
}

/**
 * Splits text into chunks suitable for TTS processing.
 * Attempts to split at sentence boundaries to maintain natural speech flow.
 * @param {string} text - The text to split into chunks
 * @param {number} maxLen - Maximum character length for each chunk
 * @returns {string[]} Array of text chunks, each within the maximum length
 */
function splitIntoChunks(text: string, maxLen: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let current = '';
    
    for (const sentence of sentences) {
        if ((current + ' ' + sentence).length > maxLen && current) {
            chunks.push(current.trim());
            current = sentence;
        } else {
            current = current ? current + ' ' + sentence : sentence;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    
    return chunks.length ? chunks : [text.slice(0, maxLen)];
}

/**
 * Generates speech for a single text chunk using the Deepgram TTS API.
 * @param {string} text - The text chunk to convert to speech
 * @param {string} apiKey - The Deepgram API key for authentication
 * @param {string} voice - The voice model identifier
 * @returns {Promise<{audio: Buffer, words: WordTiming[]}>} Audio buffer and word timings
 * @throws {string} Error message if the API request fails
 */
function generateChunk(text: string, apiKey: string, voice: string): Promise<{ audio: Buffer; words: WordTiming[] }> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ text });
        
        const req = https.request({
            hostname: 'api.deepgram.com',
            path: `/v1/speak?model=${voice}&encoding=mp3`,
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }, res => {
            const chunks: Buffer[] = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(`Deepgram API error: ${res.statusCode}`);
                    return;
                }
                
                const audioBuffer = Buffer.concat(chunks);
                
                // Parse word timings from response header
                const timingsHeader = res.headers['dg-word-timings'];
                let words: WordTiming[] = [];
                
                if (timingsHeader) {
                    try {
                        const timings = JSON.parse(timingsHeader as string);
                        words = timings.map((t: { word: string; start: number; end: number }) => ({
                            word: t.word,
                            start: t.start,
                            end: t.end
                        }));
                    } catch { /* fallback to no timings */ }
                }
                
                resolve({ audio: audioBuffer, words });
            });
        });
        
        req.on('error', e => reject(e.message));
        req.write(data);
        req.end();
    });
}

/**
 * Transcribes audio using AssemblyAI to get accurate word-level timestamps.
 * @param {string} audioBase64 - Base64-encoded audio data
 * @param {string} apiKey - AssemblyAI API key
 * @returns {Promise<WordTiming[]>} Array of word timings with start/end in seconds
 */
async function transcribeWithAssemblyAI(audioBase64: string, apiKey: string): Promise<WordTiming[]> {
    // Step 1: Upload audio to AssemblyAI
    const uploadUrl = await uploadToAssemblyAI(audioBase64, apiKey);
    
    // Step 2: Create transcription request
    const transcriptId = await createTranscription(uploadUrl, apiKey);
    
    // Step 3: Poll for completion and get word timings
    const words = await pollTranscription(transcriptId, apiKey);
    
    return words;
}

/**
 * Uploads audio data to AssemblyAI.
 * @param {string} audioBase64 - Base64-encoded audio data
 * @param {string} apiKey - AssemblyAI API key
 * @returns {Promise<string>} Upload URL for the audio
 */
function uploadToAssemblyAI(audioBase64: string, apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        
        const req = https.request({
            hostname: 'api.assemblyai.com',
            path: '/v2/upload',
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/octet-stream',
                'Content-Length': audioBuffer.length
            }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(`AssemblyAI upload error: ${res.statusCode} - ${body}`);
                    return;
                }
                try {
                    const json = JSON.parse(body);
                    if (json.upload_url) resolve(json.upload_url);
                    else reject('AssemblyAI upload returned no URL');
                } catch { reject('Failed to parse AssemblyAI upload response'); }
            });
        });
        
        req.on('error', e => reject(`AssemblyAI upload failed: ${e.message}`));
        req.write(audioBuffer);
        req.end();
    });
}

/**
 * Creates a transcription request with AssemblyAI.
 * @param {string} audioUrl - URL of the uploaded audio
 * @param {string} apiKey - AssemblyAI API key
 * @returns {Promise<string>} Transcript ID for polling
 */
function createTranscription(audioUrl: string, apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ audio_url: audioUrl });
        
        const req = https.request({
            hostname: 'api.assemblyai.com',
            path: '/v2/transcript',
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(`AssemblyAI transcription error: ${res.statusCode} - ${body}`);
                    return;
                }
                try {
                    const json = JSON.parse(body);
                    if (json.id) resolve(json.id);
                    else reject('AssemblyAI returned no transcript ID');
                } catch { reject('Failed to parse AssemblyAI response'); }
            });
        });
        
        req.on('error', e => reject(`AssemblyAI request failed: ${e.message}`));
        req.write(data);
        req.end();
    });
}

/**
 * Polls AssemblyAI for transcription completion and returns word timings.
 * @param {string} transcriptId - The transcript ID to poll
 * @param {string} apiKey - AssemblyAI API key
 * @returns {Promise<WordTiming[]>} Array of word timings
 */
async function pollTranscription(transcriptId: string, apiKey: string): Promise<WordTiming[]> {
    const maxAttempts = 60; // Max 60 attempts (about 2 minutes)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = await getTranscriptionStatus(transcriptId, apiKey);
        
        if (result.status === 'completed') {
            // Convert milliseconds to seconds for word timings
            return (result.words || []).map((w: { text: string; start: number; end: number }) => ({
                word: w.text,
                start: w.start / 1000,
                end: w.end / 1000
            }));
        }
        
        if (result.status === 'error') {
            throw new Error(`AssemblyAI transcription failed: ${result.error}`);
        }
        
        // Wait 2 seconds before next poll
        await sleep(2000);
    }
    
    throw new Error('AssemblyAI transcription timed out');
}

/**
 * Gets the current status of a transcription.
 * @param {string} transcriptId - The transcript ID
 * @param {string} apiKey - AssemblyAI API key
 * @returns {Promise<{status: string, words?: any[], error?: string}>} Transcription status and data
 */
function getTranscriptionStatus(transcriptId: string, apiKey: string): Promise<{ status: string; words?: { text: string; start: number; end: number }[]; error?: string }> {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.assemblyai.com',
            path: `/v2/transcript/${transcriptId}`,
            method: 'GET',
            headers: {
                'Authorization': apiKey
            }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(`AssemblyAI status error: ${res.statusCode}`);
                    return;
                }
                try {
                    const json = JSON.parse(body);
                    resolve({
                        status: json.status,
                        words: json.words,
                        error: json.error
                    });
                } catch { reject('Failed to parse AssemblyAI status response'); }
            });
        });
        
        req.on('error', e => reject(`AssemblyAI status request failed: ${e.message}`));
        req.end();
    });
}

/**
 * Deactivates the Vocalize MD extension.
 * Cleans up resources by disposing of the webview panel if it exists.
 */
export function deactivate() {
    panel?.dispose();
}
